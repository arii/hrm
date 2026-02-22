import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '@/types/websocket'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '@/utils/hrCalculations'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'
import { getCookie, setCookie } from '@/utils/cookies'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_EXPONENTIAL_ATTEMPTS,
  RECONNECT_LINEAR_DELAY_MS,
} from '@/constants/bluetooth-reconnection'
import {
  HR_SERVICE_UUID,
  HR_CHARACTERISTIC_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHARACTERISTIC_UUID,
  ROLLING_AVG_HISTORY_LENGTH,
  MISSED_PACKET_THRESHOLD_BUFFER_MS,
  MIN_MISSED_PACKET_THRESHOLD_MS,
  HEARTBEAT_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
} from '@/constants/bluetooth-config'

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: BLUETOOTH_MESSAGES.disconnected,
  [BluetoothConnectionStatus.CONNECTING]: BLUETOOTH_MESSAGES.connecting,
  [BluetoothConnectionStatus.CONNECTED]: BLUETOOTH_MESSAGES.connected,
  [BluetoothConnectionStatus.RECONNECTING]: BLUETOOTH_MESSAGES.reconnecting,
  [BluetoothConnectionStatus.DISCONNECTING]: BLUETOOTH_MESSAGES.disconnecting,
  [BluetoothConnectionStatus.ERROR]: BLUETOOTH_MESSAGES.error,
}

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  throttleMs?: number
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
  const [status, setStatus] = useState<BluetoothConnectionStatus>(
    BluetoothConnectionStatus.DISCONNECTED
  )
  const [customStatusMessage, setCustomStatusMessage] = useState<string | null>(
    null
  )
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isDataStale, setIsDataStale] = useState(false)
  const [signalPeriodMs, setSignalPeriodMs] = useState<number>(0)
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const deviceStatus = customStatusMessage ?? statusMessageMap[status]

  const statusRef = useRef(status)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const periodHistory = useRef<number[]>([])
  const avgPeriodMs = useRef<number>(0)
  const isManualDisconnect = useRef(false)
  const isTimeoutDisconnect = useRef(false)
  const reconnectAttempts = useRef(0)
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnecting = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const activeDisconnectListenerRef = useRef<((event: Event) => void) | null>(
    null
  )
  const hrCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(
    null
  )
  const batteryCharacteristicRef =
    useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const hrListenerRef = useRef<((event: Event) => void) | null>(null)
  const batteryListenerRef = useRef<((event: Event) => void) | null>(null)

  const updateSignalPeriod = useCallback((newPeriod: number) => {
    periodHistory.current.push(newPeriod)
    if (periodHistory.current.length > ROLLING_AVG_HISTORY_LENGTH) {
      periodHistory.current.shift()
    }
    const total = periodHistory.current.reduce((sum, val) => sum + val, 0)
    const average = total / periodHistory.current.length
    avgPeriodMs.current = average
    setSignalPeriodMs(Math.round(average))
  }, [])

  const connectToGattRef = useRef<
    | ((device: BluetoothDevice, isReconnect?: boolean) => Promise<boolean>)
    | null
  >(null)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)
  const onConnectRef = useRef(onConnect)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  const sendDataRef = useRef(sendData)
  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  useEffect(() => {
    userDetailsRef.current = {
      name: userName || '',
      age: userAge || 0,
    }

    if (status === BluetoothConnectionStatus.CONNECTED) {
      const { name, age } = userDetailsRef.current
      const calculatedMaxHr = calculateMaxHr(age)
      const deviceName = deviceRef.current?.name || 'Unknown'

      const metadataData: HrmMetadataUpdateData = {
        maxHr: calculatedMaxHr,
        name: name || `Bluetooth HRM (${deviceName})`,
      }
      if (typeof age === 'number') {
        metadataData.age = age
      }

      // Prevent sending redundant metadata updates
      if (!isEqual(lastSentMetadataRef.current, metadataData)) {
        const metadata: HrmMetadataUpdateMessage = {
          type: 'HRM_METADATA_UPDATE',
          data: metadataData,
        }
        sendData(metadata)
        lastSentMetadataRef.current = metadataData
      }
    }
  }, [userName, userAge, status, sendData])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    let checkCounter = 0
    const interval = setInterval(() => {
      if (
        statusRef.current === BluetoothConnectionStatus.CONNECTED &&
        !isDataStale &&
        lastDataTime.current > 0
      ) {
        const now = Date.now()
        const timeSinceLastData = now - lastDataTime.current

        const threshold = Math.max(
          avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
          MIN_MISSED_PACKET_THRESHOLD_MS
        )

        if (timeSinceLastData > threshold) {
          updateSignalPeriod(timeSinceLastData)
        }
      }

      checkCounter++
      if (checkCounter % 2 === 0 && dataLivenessTimeoutMs > 0) {
        if (
          statusRef.current === BluetoothConnectionStatus.CONNECTED &&
          lastDataTime.current > 0
        ) {
          const timeSinceLastData = Date.now() - lastDataTime.current

          if (timeSinceLastData > dataLivenessTimeoutMs && !isDataStale) {
            setIsDataStale(true)
            setStatus(BluetoothConnectionStatus.RECONNECTING)
            setCustomStatusMessage(BLUETOOTH_MESSAGES.unstableConnection)
            isTimeoutDisconnect.current = true
            if (deviceRef.current?.gatt) deviceRef.current.gatt.disconnect()
          } else if (
            timeSinceLastData <= dataLivenessTimeoutMs &&
            isDataStale
          ) {
            setIsDataStale(false)
          }
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

  const cleanupGattConnection = useCallback(
    async (device: BluetoothDevice | null) => {
      logger.info('Cleaning up GATT connection...')

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (abortControllerRef.current) {
        if (!abortControllerRef.current.signal.aborted) {
          abortControllerRef.current.abort()
        }
        abortControllerRef.current = null
      }

      // Remove HR characteristic listener
      if (hrCharacteristicRef.current && hrListenerRef.current) {
        try {
          hrCharacteristicRef.current.removeEventListener(
            'characteristicvaluechanged',
            hrListenerRef.current
          )
        } catch (e) {
          logger.debug({ e }, 'Error removing HR listener')
        }
        hrListenerRef.current = null
        hrCharacteristicRef.current = null
      }

      // Remove Battery characteristic listener
      if (batteryCharacteristicRef.current && batteryListenerRef.current) {
        try {
          batteryCharacteristicRef.current.removeEventListener(
            'characteristicvaluechanged',
            batteryListenerRef.current
          )
        } catch (e) {
          logger.debug({ e }, 'Error removing battery listener')
        }
        batteryListenerRef.current = null
        batteryCharacteristicRef.current = null
      }

      if (device) {
        if (activeDisconnectListenerRef.current) {
          try {
            device.removeEventListener(
              'gattserverdisconnected',
              activeDisconnectListenerRef.current
            )
          } catch (e) {
            logger.debug({ e }, 'Error removing disconnect listener')
          }
          activeDisconnectListenerRef.current = null
        }

        try {
          if (device.gatt?.connected) {
            device.gatt.disconnect()
          }
        } catch (err) {
          logger.warn({ err }, 'Error disconnecting GATT')
        }
      }

      lastDataTime.current = 0
      periodHistory.current = []
      avgPeriodMs.current = 0
      setSignalPeriodMs(0)
      setBatteryLevel(null)
      setIsDataStale(false)
    },
    []
  )

  const disconnect = useCallback(() => {
    logger.info('Disconnecting Bluetooth HRM...')
    setStatus(BluetoothConnectionStatus.DISCONNECTING)
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    reconnectAttempts.current = 0

    cleanupGattConnection(deviceRef.current)

    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(null)
    setSavedDevice(null)
    setConnectionAttempted(false)
    deviceRef.current = null
  }, [cleanupGattConnection])

  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    setConnectionAttempted(false)
    try {
      setCookie('hrm_device_id', '', -1)
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
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
      if (error.name === 'NotFoundError') {
        msg = BLUETOOTH_MESSAGES.connectionCancelled
      } else if (error.name === 'SecurityError') {
        msg = BLUETOOTH_MESSAGES.securityError
      } else if (error.name === 'NetworkError') {
        msg = BLUETOOTH_MESSAGES.connectionFailed
      } else {
        msg = BLUETOOTH_MESSAGES.bluetoothError(error.name)
      }
    } else if (error instanceof Error) {
      // Handle our custom timeout error
      if (error.message.includes('timeout')) {
        msg = BLUETOOTH_MESSAGES.connectionTimeout
      } else {
        msg = `Error: ${error.message}`
      }
    }
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(BLUETOOTH_MESSAGES.errorWithDetails(msg))
    logger.error({ error }, msg)
  }, [])

  const reconnect = useCallback(
    (device: BluetoothDevice) => {
      if (reconnectAttempts.current >= BLUETOOTH_MAX_RECONNECT_ATTEMPTS) {
        setCustomStatusMessage(
          BLUETOOTH_MESSAGES.failedToReconnect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS)
        )
        logger.error(
          { attempts: reconnectAttempts.current },
          'Failed to reconnect after max attempts. Cleaning up.'
        )

        // Attempt explicit device forget if available on persistent failure
        if (typeof device.forget === 'function') {
          logger.info('Calling device.forget() on persistent failure')
          device
            .forget()
            .catch((e) => logger.warn({ e }, 'Error calling device.forget()'))
        }

        // Delay forgetDevice to allow the final status message to be displayed
        setTimeout(forgetDevice, 1500)
        return
      }

      reconnectAttempts.current++

      // Hybrid strategy: exponential for first 3 (2s, 4s, 8s), then linear
      const delay =
        reconnectAttempts.current <= RECONNECT_EXPONENTIAL_ATTEMPTS
          ? Math.pow(2, reconnectAttempts.current - 1) * RECONNECT_BASE_DELAY_MS
          : RECONNECT_LINEAR_DELAY_MS

      setStatus(BluetoothConnectionStatus.RECONNECTING)
      setCustomStatusMessage(
        BLUETOOTH_MESSAGES.reconnectingAttempt(
          'Connection lost',
          reconnectAttempts.current,
          BLUETOOTH_MAX_RECONNECT_ATTEMPTS
        )
      )

      logger.info(
        { attempt: reconnectAttempts.current, delay },
        'Scheduling reconnection attempt'
      )

      reconnectTimeoutRef.current = setTimeout(() => {
        if (statusRef.current !== BluetoothConnectionStatus.CONNECTED) {
          connectToGattRef.current?.(device, true).catch((err) => {
            logger.warn({ err }, 'Reconnect attempt failed')
            // Recursive call to try again
            reconnect(device)
          })
        }
      }, delay)
    },
    [forgetDevice]
  )

  const onDisconnected = useCallback(
    (event: Event | undefined) => {
      const device = (event?.target as BluetoothDevice) ?? deviceRef.current
      if (!device) {
        logger.warn('onDisconnected called without a device reference.')
        return
      }

      // Ignore if we are in the middle of a manual disconnect
      if (
        statusRef.current === BluetoothConnectionStatus.DISCONNECTING ||
        isManualDisconnect.current
      ) {
        logger.info('Device disconnected (manual). Skipping auto-reconnect.')
        return
      }

      logger.info(
        {
          device: device.name,
          timeout: isTimeoutDisconnect.current,
          status: statusRef.current,
        },
        'Device disconnected unexpectedly'
      )

      setBatteryLevel(null)
      setStatus(BluetoothConnectionStatus.DISCONNECTED)

      // Start the reconnection process
      // We don't reset reconnectAttempts here because this could be a disconnect
      // that happened during a reconnection attempt or a stable connection.
      // Note: reconnectAttempts is reset to 0 on a successful connection (connectToGatt)
      // or a manual disconnect.
      reconnect(device)
    },
    [reconnect]
  )

  // Cleanup
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
      // Clean up all GATT-related resources on unmount
      cleanupGattConnection(deviceRef.current)

      if (
        typeof window !== 'undefined' &&
        process.env.NEXT_PUBLIC_TESTING === 'true'
      ) {
        if (window.TEST_CONTROLS) {
          delete window.TEST_CONTROLS.setHrmStatus
          delete window.TEST_CONTROLS.setCustomHrmStatusMessage
        }
      }
    }
  }, [cleanupGattConnection])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice, isReconnect = false) => {
      // If we're already connecting, abort the previous attempt
      if (
        abortControllerRef.current &&
        !abortControllerRef.current.signal.aborted
      ) {
        logger.warn(
          { device: device.name },
          'Aborting existing connection attempt to start new one.'
        )
        abortControllerRef.current.abort()
      }

      // Explicit cleanup before each connection attempt
      await cleanupGattConnection(device)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        deviceRef.current = device

        if (!isReconnect) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage(
            BLUETOOTH_MESSAGES.connectingToDevice(device.name || '')
          )
        }

        let server: BluetoothRemoteGATTServer | undefined
        let attempt = 0
        const maxRetries = 3

        while (attempt < maxRetries) {
          try {
            server = await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: CONNECTION_TIMEOUT_MS,
              errorMessage: 'GATT connection timeout',
              signal: abortController.signal,
            })
            break
          } catch (error) {
            attempt++
            const isBusy =
              String(error).includes('busy') ||
              String(error).includes('NetworkError')
            if (isBusy && attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000
              logger.warn(
                { device: device.name, attempt, delay, error },
                'Device likely busy. Retrying...'
              )
              setStatus(BluetoothConnectionStatus.CONNECTING)
              setCustomStatusMessage(
                BLUETOOTH_MESSAGES.deviceBusy(delay, attempt, maxRetries)
              )
              await new Promise((res) => setTimeout(res, delay))
              continue
            }
            throw error
          }
        }

        if (abortController.signal.aborted) {
          server?.disconnect()
          throw new DOMException('Connection aborted', 'AbortError')
        }

        // Attach disconnect listener
        device.addEventListener('gattserverdisconnected', onDisconnected)
        activeDisconnectListenerRef.current = onDisconnected

        const service = await server!.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        try {
          const batteryService =
            await server!.getPrimaryService(BATTERY_SERVICE_UUID)
          const batteryChar = await batteryService.getCharacteristic(
            BATTERY_LEVEL_CHARACTERISTIC_UUID
          )
          const value = await batteryChar.readValue()
          setBatteryLevel(value.getUint8(0))
          await batteryChar.startNotifications()

          const batteryListener = (e: Event) => {
            const target = e.target as BluetoothRemoteGATTCharacteristic
            setBatteryLevel(target.value!.getUint8(0))
          }
          batteryChar.addEventListener(
            'characteristicvaluechanged',
            batteryListener
          )
          batteryCharacteristicRef.current = batteryChar
          batteryListenerRef.current = batteryListener
        } catch {
          /* Battery service optional */
        }

        await characteristic.startNotifications()
        setIsDataStale(false)

        const hrListener = (event: Event) => {
          const now = Date.now()
          if (lastDataTime.current > 0) {
            const delta = now - lastDataTime.current
            updateSignalPeriod(delta)
          }
          const target = event.target as BluetoothRemoteGATTCharacteristic
          const value = target.value
          if (!value) return
          const heartRate = parseHeartRate(value)
          lastDataTime.current = now
          logger.debug({ heartRate }, 'Heart rate data received')
          onHeartRateUpdateRef.current?.(heartRate)
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
        setCookie('hrm_device_id', device.id)
        isManualDisconnect.current = false
        isTimeoutDisconnect.current = false
        reconnectAttempts.current = 0
        onConnectRef.current?.()
        return true
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const errorName = error instanceof DOMException ? error.name : 'Error'

        const isIntentionalAbort =
          errorName === 'AbortError' && abortController.signal.aborted

        if (!isIntentionalAbort) {
          logger.error(
            { errorName, errorMsg, device: device.name },
            'GATT Connection failed'
          )
        }

        if (errorMsg.includes('timeout')) {
          // Timeout is now just another failed attempt, let reconnection logic handle it
          logger.warn({ device: device.name }, 'Connection timeout detected.')
          setStatus(BluetoothConnectionStatus.ERROR)
          setCustomStatusMessage(BLUETOOTH_MESSAGES.connectionTimeout)
        }

        // Rethrow to be caught by reconnect logic if applicable
        throw error
      }
    },
    [cleanupGattConnection, onDisconnected, updateSignalPeriod]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  /**
   * Scans for a Bluetooth device, connects to it, and starts streaming heart rate data.
   * Will attempt to reconnect to a previously saved device if one exists.
   * @param userNameFromArgs The user's name for display purposes.
   * @param userAgeFromArgs The user's age, used to calculate max HR.
   * @throws If the connection fails (e.g., user cancellation, WebSocket disconnect).
   */
  const connectAndStream = useCallback(
    async (
      userNameFromArgs?: string,
      userAgeFromArgs?: number,
      options: { silent?: boolean } = {}
    ): Promise<boolean> => {
      const { silent = false } = options

      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (statusRef.current === BluetoothConnectionStatus.CONNECTED) return true
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        if (!silent) handleConnectionError(err)
        throw err
      }

      // We don't use a guard here to allow manual overrides if connection is stuck,
      // but we let connectToGatt handle the abortion of the previous attempt.
      isConnecting.current = true
      try {
        logger.info(
          { connectionStatus, savedDevice },
          'connectAndStream called'
        )
        setStatus(BluetoothConnectionStatus.CONNECTING)
        let device = savedDevice

        if (!device) {
          setCustomStatusMessage(BLUETOOTH_MESSAGES.checkingSavedDevices)
          const savedDeviceId = getCookie('hrm_device_id')

          // Abort silent connection if no device ID is found, to prevent looping.
          if (silent && !savedDeviceId) {
            logger.warn(
              { savedDeviceId },
              'Aborting silent connect: No saved device ID.'
            )
            throw new Error('No saved device ID for silent connection.')
          }

          logger.info(
            { savedDeviceId, hasGetDevices: !!navigator.bluetooth?.getDevices },
            'Looking for saved device'
          )
          if (savedDeviceId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            logger.info(
              { count: devices.length, savedDeviceId },
              'Available devices'
            )
            const foundDevice = devices.find((d) => d.id === savedDeviceId)

            if (foundDevice) {
              logger.info(
                { device: foundDevice.name },
                'Found saved device, connecting'
              )
              await connectToGatt(foundDevice)
              return true
            } else {
              logger.info(
                { savedDeviceId },
                'Saved device not found in available devices'
              )
            }
          } else {
            logger.info(
              {
                savedDeviceId,
                hasGetDevices: !!navigator.bluetooth?.getDevices,
              },
              'Cannot get saved device'
            )
          }
        }

        if (!device && !silent) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage(BLUETOOTH_MESSAGES.scanningForDevices)
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          logger.info({ device: device.name }, 'Connecting to device')
          await connectToGatt(device)
          return true
        } else if (!silent) {
          logger.info('No device to connect')
          throw new Error('No device found or selected for connection.')
        }
        return false // Silent mode: no device available
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        if (!silent) {
          handleConnectionError(error)
        } else {
          logger.info({ error, errorMsg }, 'Silent auto-connect failed.')
          // Reset the status to allow for a manual connection attempt.
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          throw error
        }
        if (!silent) {
          throw error
        }
        return false
      } finally {
        isConnecting.current = false
      }
    },
    [
      connectionStatus,
      savedDevice,
      connectToGatt,
      handleConnectionError,
      userName,
      userAge,
    ]
  )

  const autoConnect = useCallback(async (): Promise<void> => {
    // For auto-connect, we definitely want to avoid multiple concurrent attempts
    if (isConnecting.current) return
    isConnecting.current = true

    try {
      setConnectionAttempted(true)
      setStatus(BluetoothConnectionStatus.CONNECTING)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.connectingToSavedDevice)

      const deviceFoundAndAttempted = await connectAndStream(
        undefined,
        undefined,
        { silent: true }
      )

      if (!deviceFoundAndAttempted) {
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        setCustomStatusMessage(null)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error({ error }, 'Auto-connect failed')
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      if (errorMsg.includes('No saved device ID')) {
        setCustomStatusMessage(null)
      } else {
        setCustomStatusMessage(BLUETOOTH_MESSAGES.autoConnectFailed)
      }
    } finally {
      isConnecting.current = false
    }
  }, [connectAndStream])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: status === BluetoothConnectionStatus.CONNECTED,
    isDataStale,
    isSupported, // Export this flag
    signalPeriodMs,
    connectionAttempted,
  }
}

export default useBluetoothHRM
