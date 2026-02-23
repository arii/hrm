import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmMetadataUpdateData } from '@/types/websocket'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '@/utils/hrCalculations'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  getBackoffDelay,
  FAST_RECONNECT_DELAY_MS,
  FAST_RECONNECT_MAX_ATTEMPTS,
} from '@/constants/bluetooth-reconnection'
import { useBackgroundPersistence } from './useBackgroundPersistence'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

const ROLLING_AVG_HISTORY_LENGTH = 5
const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500
const MIN_MISSED_PACKET_THRESHOLD_MS = 1500

export const HEARTBEAT_INTERVAL_MS =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 500 : 1000

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: BLUETOOTH_MESSAGES.disconnected,
  [BluetoothConnectionStatus.CONNECTING]: BLUETOOTH_MESSAGES.connecting,
  [BluetoothConnectionStatus.CONNECTED]: BLUETOOTH_MESSAGES.connected,
  [BluetoothConnectionStatus.RECONNECTING]: BLUETOOTH_MESSAGES.reconnecting,
  [BluetoothConnectionStatus.ERROR]: BLUETOOTH_MESSAGES.error,
}

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  userName?: string | null
  userAge?: number | null
  onHeartRateUpdate?: (heartRate: number) => void
  onConnect?: () => void
  heartbeatInterval?: number
}

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = 10000,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
    heartbeatInterval = HEARTBEAT_INTERVAL_MS,
  } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [status, setStatus] = useState(BluetoothConnectionStatus.DISCONNECTED)
  const [customStatusMessage, setCustomStatusMessage] = useState<string | null>(
    null
  )
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isDataStale, setIsDataStale] = useState(false)
  const [signalPeriodMs, setSignalPeriodMs] = useState(0)
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const isSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth

  const deviceStatus = customStatusMessage ?? statusMessageMap[status]

  const statusRef = useRef(status)
  const lastDataTime = useRef(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const periodHistory = useRef<number[]>([])
  const avgPeriodMs = useRef(0)
  const isManualDisconnect = useRef(false)
  const isTimeoutDisconnect = useRef(false)
  const reconnectAttempts = useRef(0)
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnecting = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeDisconnectListenerRef = useRef<((event: Event) => void) | null>(
    null
  )

  useBackgroundPersistence(status === BluetoothConnectionStatus.CONNECTED)

  const hrCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(
    null
  )
  const batteryCharacteristicRef =
    useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const hrListenerRef = useRef<((event: Event) => void) | null>(null)
  const batteryListenerRef = useRef<((event: Event) => void) | null>(null)
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })

  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)
  const onConnectRef = useRef(onConnect)
  const sendDataRef = useRef(sendData)
  const connectToGattRef = useRef<
    | ((device: BluetoothDevice, isReconnect?: boolean) => Promise<boolean>)
    | null
  >(null)

  const cleanupGattConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()

    const device = deviceRef.current
    if (device) {
      if (activeDisconnectListenerRef.current) {
        device.removeEventListener(
          'gattserverdisconnected',
          activeDisconnectListenerRef.current
        )
        activeDisconnectListenerRef.current = null
      }
      if (hrCharacteristicRef.current && hrListenerRef.current) {
        hrCharacteristicRef.current.removeEventListener(
          'characteristicvaluechanged',
          hrListenerRef.current
        )
        hrListenerRef.current = null
      }
      if (batteryCharacteristicRef.current && batteryListenerRef.current) {
        batteryCharacteristicRef.current.removeEventListener(
          'characteristicvaluechanged',
          batteryListenerRef.current
        )
        batteryListenerRef.current = null
      }
      if (device.gatt?.connected) device.gatt.disconnect()
    }
    hrCharacteristicRef.current = null
    batteryCharacteristicRef.current = null
  }, [])

  const updateSignalPeriod = useCallback((newPeriod: number) => {
    periodHistory.current.push(newPeriod)
    if (periodHistory.current.length > ROLLING_AVG_HISTORY_LENGTH)
      periodHistory.current.shift()
    avgPeriodMs.current =
      periodHistory.current.reduce((s, v) => s + v, 0) /
      periodHistory.current.length
    setSignalPeriodMs(Math.round(avgPeriodMs.current))
  }, [])

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
    onConnectRef.current = onConnect
    sendDataRef.current = sendData
    statusRef.current = status
    userDetailsRef.current = { name: userName || '', age: userAge || 0 }

    if (status === BluetoothConnectionStatus.CONNECTED) {
      const name =
        userDetailsRef.current.name ||
        `Bluetooth HRM (${deviceRef.current?.name || 'Unknown'})`
      const age = userDetailsRef.current.age || 30
      const metadata: HrmMetadataUpdateData = {
        maxHr: calculateMaxHr(age),
        name,
        age,
      }
      if (!isEqual(lastSentMetadataRef.current, metadata)) {
        sendData({ type: 'HRM_METADATA_UPDATE', data: metadata })
        lastSentMetadataRef.current = metadata
      }
    }
  }, [userName, userAge, status, sendData, onHeartRateUpdate, onConnect])

  useEffect(() => {
    let checkCounter = 0
    const interval = setInterval(() => {
      if (
        statusRef.current === BluetoothConnectionStatus.CONNECTED &&
        !isDataStale &&
        lastDataTime.current > 0
      ) {
        const threshold = Math.max(
          avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
          MIN_MISSED_PACKET_THRESHOLD_MS
        )
        if (Date.now() - lastDataTime.current > threshold)
          updateSignalPeriod(Date.now() - lastDataTime.current)
      }
      if (
        ++checkCounter % 2 === 0 &&
        dataLivenessTimeoutMs > 0 &&
        statusRef.current === BluetoothConnectionStatus.CONNECTED &&
        lastDataTime.current > 0
      ) {
        const stale = Date.now() - lastDataTime.current > dataLivenessTimeoutMs
        if (stale && !isDataStale) {
          setIsDataStale(true)
          setStatus(BluetoothConnectionStatus.RECONNECTING)
          setCustomStatusMessage(BLUETOOTH_MESSAGES.unstableConnection)
          isTimeoutDisconnect.current = true
          if (deviceRef.current?.gatt) deviceRef.current.gatt.disconnect()
        } else if (!stale && isDataStale) {
          setIsDataStale(false)
        }
      }
    }, heartbeatInterval)
    return () => clearInterval(interval)
  }, [
    dataLivenessTimeoutMs,
    isDataStale,
    updateSignalPeriod,
    heartbeatInterval,
  ])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    cleanupGattConnection()
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })
    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(null)
    setSavedDevice(null)
    setBatteryLevel(null)
    setConnectionAttempted(false)
    deviceRef.current = null
    periodHistory.current = []
    avgPeriodMs.current = 0
    setSignalPeriodMs(0)
  }, [cleanupGattConnection])

  useEffect(() => {
    isManualDisconnect.current = false
    if (
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_TESTING === 'true'
    ) {
      window.TEST_CONTROLS = {
        ...window.TEST_CONTROLS,
        setHrmStatus: setStatus,
        setCustomHrmStatusMessage: setCustomStatusMessage,
      }
    }
    return () => {
      cleanupGattConnection()
      if (
        typeof window !== 'undefined' &&
        process.env.NEXT_PUBLIC_TESTING === 'true' &&
        window.TEST_CONTROLS
      ) {
        delete window.TEST_CONTROLS.setHrmStatus
        delete window.TEST_CONTROLS.setCustomHrmStatusMessage
      }
    }
  }, [cleanupGattConnection])

  const forgetDevice = useCallback(async () => {
    logger.info('Forgetting device...')
    disconnect()
    try {
      setCookie('hrm_device_id', '', -1)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.devicePermissionsRevoked)
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.errorClearingPermissions)
    }
  }, [disconnect])

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = BLUETOOTH_MESSAGES.unknownError
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError')
        msg = BLUETOOTH_MESSAGES.connectionCancelled
      else if (error.name === 'SecurityError')
        msg = BLUETOOTH_MESSAGES.securityError
      else if (error.name === 'NetworkError')
        msg = BLUETOOTH_MESSAGES.connectionFailed
      else msg = BLUETOOTH_MESSAGES.bluetoothError(error.name)
    } else if (error instanceof Error) {
      msg = error.message.includes('timeout')
        ? BLUETOOTH_MESSAGES.connectionTimeout
        : `Error: ${error.message}`
    }
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(BLUETOOTH_MESSAGES.errorWithDetails(msg))
    logger.error({ error }, msg)
  }, [])

  const reconnect = useCallback(
    (device: BluetoothDevice, reason = 'Connection lost') => {
      if (reconnectTimeoutRef.current || isConnecting.current) {
        logger.debug(
          {
            hasTimeout: !!reconnectTimeoutRef.current,
            isConnecting: isConnecting.current,
          },
          'Reconnection already in progress. Skipping.'
        )
        return
      }

      if (reconnectAttempts.current >= BLUETOOTH_MAX_RECONNECT_ATTEMPTS) {
        setCustomStatusMessage(
          BLUETOOTH_MESSAGES.failedToReconnect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS)
        )
        logger.error('Failed to reconnect. Forgetting device.')
        setTimeout(forgetDevice, 1500)
        return
      }
      reconnectAttempts.current++
      const delay = getBackoffDelay(reconnectAttempts.current)
      const isBusy =
        reason.toLowerCase().includes('busy') ||
        reason.toLowerCase().includes('networkerror')
      setStatus(
        isBusy
          ? BluetoothConnectionStatus.CONNECTING
          : BluetoothConnectionStatus.RECONNECTING
      )
      setCustomStatusMessage(
        isBusy
          ? BLUETOOTH_MESSAGES.deviceBusy(
              delay,
              reconnectAttempts.current,
              BLUETOOTH_MAX_RECONNECT_ATTEMPTS
            )
          : BLUETOOTH_MESSAGES.reconnectingAttempt(
              reason,
              reconnectAttempts.current,
              BLUETOOTH_MAX_RECONNECT_ATTEMPTS
            )
      )
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null
        if (
          statusRef.current !== BluetoothConnectionStatus.CONNECTED &&
          !isConnecting.current &&
          !isManualDisconnect.current
        ) {
          connectToGattRef.current?.(device, true).catch((error) => {
            logger.warn({ error }, 'Reconnect failed')
            reconnect(
              device,
              error instanceof Error ? error.message : String(error)
            )
          })
        }
      }, delay)
    },
    [forgetDevice]
  )

  const onDisconnected = useCallback(
    (event: Event | undefined) => {
      const device = (event?.target as BluetoothDevice) ?? deviceRef.current
      if (!device) return
      logger.info(
        {
          device: device.name,
          manual: isManualDisconnect.current,
          timeout: isTimeoutDisconnect.current,
        },
        'Device disconnected'
      )
      setBatteryLevel(null)
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      if (isManualDisconnect.current) {
        reconnectAttempts.current = 0
        return
      }
      reconnectAttempts.current = 0
      reconnect(device, 'Connection lost')
    },
    [reconnect]
  )

  const connectToGatt = useCallback(
    async (device: BluetoothDevice, isReconnect = false) => {
      if (isConnecting.current) return true
      if (abortControllerRef.current) abortControllerRef.current.abort()
      isConnecting.current = true
      abortControllerRef.current = new AbortController()
      try {
        const previousDevice = deviceRef.current
        if (
          previousDevice &&
          previousDevice !== device &&
          activeDisconnectListenerRef.current
        ) {
          previousDevice.removeEventListener(
            'gattserverdisconnected',
            activeDisconnectListenerRef.current
          )
        }
        deviceRef.current = device
        if (!isReconnect) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage(
            BLUETOOTH_MESSAGES.connectingToDevice(device.name || '')
          )
        }
        let server: BluetoothRemoteGATTServer | undefined
        for (
          let attempt = 1;
          attempt <= FAST_RECONNECT_MAX_ATTEMPTS;
          attempt++
        ) {
          try {
            server = await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: 20000,
              errorMessage: 'GATT connection timeout',
              signal: abortControllerRef.current.signal,
            })
            break
          } catch (error) {
            if (
              (String(error).includes('busy') ||
                String(error).includes('NetworkError')) &&
              attempt < FAST_RECONNECT_MAX_ATTEMPTS
            ) {
              await new Promise((res) =>
                setTimeout(res, FAST_RECONNECT_DELAY_MS)
              )
              continue
            }
            throw error
          }
        }
        if (abortControllerRef.current?.signal.aborted) {
          server?.disconnect()
          throw new DOMException('Connection aborted', 'AbortError')
        }
        device.addEventListener('gattserverdisconnected', onDisconnected)
        activeDisconnectListenerRef.current = onDisconnected
        const service = await server!.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )
        try {
          const bService = await server!.getPrimaryService(BATTERY_SERVICE_UUID)
          const bChar = await bService.getCharacteristic(
            BATTERY_LEVEL_CHARACTERISTIC_UUID
          )
          setBatteryLevel((await bChar.readValue()).getUint8(0))
          await bChar.startNotifications()
          const bListener = (e: Event) => {
            const target = e.target as BluetoothRemoteGATTCharacteristic
            if (target?.value) {
              setBatteryLevel(target.value.getUint8(0))
            }
          }
          bChar.addEventListener('characteristicvaluechanged', bListener)
          batteryCharacteristicRef.current = bChar
          batteryListenerRef.current = bListener
        } catch {
          /* battery optional */
        }
        await characteristic.startNotifications()
        setIsDataStale(false)
        const hrListener = (e: Event) => {
          const target = e.target as BluetoothRemoteGATTCharacteristic
          if (!target?.value) return

          const now = Date.now()
          if (lastDataTime.current > 0)
            updateSignalPeriod(now - lastDataTime.current)

          const hr = parseHeartRate(target.value)
          lastDataTime.current = now
          onHeartRateUpdateRef.current?.(hr)
        }
        characteristic.addEventListener(
          'characteristicvaluechanged',
          hrListener
        )
        hrCharacteristicRef.current = characteristic
        hrListenerRef.current = hrListener
        setStatus(BluetoothConnectionStatus.CONNECTED)
        setCustomStatusMessage(
          BLUETOOTH_MESSAGES.connectedToDevice(device.name || '')
        )

        setSavedDevice(device)
        Cookies.set('hrm_device_id', device.id, {
          expires: 365,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        })
        isManualDisconnect.current = false
        isTimeoutDisconnect.current = false
        reconnectAttempts.current = 0
        onConnectRef.current?.()
        return true
      } catch (error) {
        if (String(error).includes('timeout')) {
          setStatus(BluetoothConnectionStatus.ERROR)
          setCustomStatusMessage(BLUETOOTH_MESSAGES.connectionTimeoutReset)
          reconnectAttempts.current = BLUETOOTH_MAX_RECONNECT_ATTEMPTS
          setTimeout(() => {
            setCookie('hrm_device_id', '', -1)
            setStatus(BluetoothConnectionStatus.DISCONNECTED)
            setCustomStatusMessage(BLUETOOTH_MESSAGES.devicePermissionsRevoked)
            setSavedDevice(null)
            setBatteryLevel(null)
            deviceRef.current = null
            reconnectAttempts.current = 0
          }, 2000)
        }
        throw error
      } finally {
        isConnecting.current = false
      }
    },
    [onDisconnected, updateSignalPeriod]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  const connectAndStream = useCallback(
    async (
      uName?: string,
      uAge?: number,
      options: { silent?: boolean } = {}
    ): Promise<boolean> => {
      const { silent = false } = options
      if (uName) userDetailsRef.current.name = uName
      if (uAge) userDetailsRef.current.age = uAge
      if (statusRef.current === BluetoothConnectionStatus.CONNECTED) return true
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        if (!silent) handleConnectionError(err)
        throw err
      }
      try {
        let device = savedDevice
        if (!device) {
          const savedId = getCookie('hrm_device_id')
          if (silent && !savedId) throw new Error('No saved device ID')
          if (savedId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            device = devices.find((d) => d.id === savedId) || null
          }
        }
        if (!device && !silent) {
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }
        if (device) return await connectToGatt(device)
        if (!silent) throw new Error('No device found')
        return false
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError')
          throw error
        if (!silent) handleConnectionError(error)
        else setStatus(BluetoothConnectionStatus.DISCONNECTED)
        throw error
      }
    },
    [connectionStatus, savedDevice, connectToGatt, handleConnectionError]
  )

  const autoConnect = useCallback(async () => {
    if (isConnecting.current) return
    try {
      setConnectionAttempted(true)
      setStatus(BluetoothConnectionStatus.CONNECTING)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.connectingToSavedDevice)
      if (!(await connectAndStream(undefined, undefined, { silent: true }))) {
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        setCustomStatusMessage(null)
      }
    } catch (e) {
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(
        String(e).includes('No saved device ID')
          ? null
          : BLUETOOTH_MESSAGES.autoConnectFailed
      )
    }
  }, [connectAndStream])

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (statusRef.current === BluetoothConnectionStatus.CONNECTED) {
          if (!deviceRef.current?.gatt?.connected) {
            if (deviceRef.current) {
              reconnect(deviceRef.current, 'Background disconnect')
            } else {
              autoConnect()
            }
          }
        } else if (
          !isManualDisconnect.current &&
          !isConnecting.current &&
          !reconnectTimeoutRef.current
        ) {
          autoConnect()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [reconnect, autoConnect])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: status === BluetoothConnectionStatus.CONNECTED,
    isDataStale,
    isSupported,
    signalPeriodMs,
    connectionAttempted,
  }
}

export default useBluetoothHRM
