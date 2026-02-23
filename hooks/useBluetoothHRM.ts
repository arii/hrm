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
  getBackoffDelay,
  FAST_RECONNECT_DELAY_MS,
  FAST_RECONNECT_MAX_ATTEMPTS,
  GATT_DISCONNECT_COOLDOWN_MS,
  CONNECTION_STORM_THRESHOLD_MS,
  PERMISSIONS_REVOKED_TIMEOUT_MS,
} from '@/constants/bluetooth-reconnection'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

const ROLLING_AVG_HISTORY_LENGTH = 5
const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500
const MIN_MISSED_PACKET_THRESHOLD_MS = 1500

const HEARTBEAT_INTERVAL_MS_test = 500
const HEARTBEAT_INTERVAL_MS_prod = 1000
export const HEARTBEAT_INTERVAL_MS =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    ? HEARTBEAT_INTERVAL_MS_test
    : HEARTBEAT_INTERVAL_MS_prod

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: BLUETOOTH_MESSAGES.disconnected,
  [BluetoothConnectionStatus.CONNECTING]: BLUETOOTH_MESSAGES.connecting,
  [BluetoothConnectionStatus.CONNECTED]: BLUETOOTH_MESSAGES.connected,
  [BluetoothConnectionStatus.RECONNECTING]: BLUETOOTH_MESSAGES.reconnecting,
  [BluetoothConnectionStatus.DISCONNECTING]: 'Disconnecting...',
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
  isWorkoutActive?: boolean
}

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = 10000,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
    heartbeatInterval = HEARTBEAT_INTERVAL_MS,
    isWorkoutActive = false,
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
  const isDisconnecting = useRef(false)
  const isMounted = useRef(true)
  const lastConnectTimeRef = useRef<number>(0)
  const activeDisconnectListenerRef = useRef<((event: Event) => void) | null>(
    null
  )

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

  const abortControllerRef = useRef<AbortController | null>(null)
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

  const disconnect = useCallback(async () => {
    if (isDisconnecting.current) return
    isDisconnecting.current = true

    try {
      if (isMounted.current) {
        setStatus(BluetoothConnectionStatus.DISCONNECTING)
      }
      isManualDisconnect.current = true
      isTimeoutDisconnect.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)

      if (deviceRef.current?.gatt?.connected) {
        logger.info('Disconnecting GATT server...')
        deviceRef.current.gatt.disconnect()
        // Cool-down period to allow OS to clean up the GATT stack
        await new Promise((res) => setTimeout(res, GATT_DISCONNECT_COOLDOWN_MS))
      }

      sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

      if (isMounted.current) {
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        setCustomStatusMessage(null)
        setSavedDevice(null)
        setBatteryLevel(null)
        setConnectionAttempted(false)
        deviceRef.current = null
        periodHistory.current = []
        avgPeriodMs.current = 0
        setSignalPeriodMs(0)
      }
    } finally {
      isDisconnecting.current = false
    }
  }, [])

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
    if (isMounted.current) {
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.errorWithDetails(msg))
    }
    logger.error({ error }, msg)
  }, [])

  const reconnect = useCallback(
    (device: BluetoothDevice, reason = 'Connection lost') => {
      if (reconnectAttempts.current >= BLUETOOTH_MAX_RECONNECT_ATTEMPTS) {
        setCustomStatusMessage(
          BLUETOOTH_MESSAGES.failedToReconnect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS)
        )
        logger.error(
          'Failed to reconnect after max attempts. Stopping auto-reconnect.'
        )
        return
      }

      reconnectAttempts.current++

      const isZombieError =
        reason.toLowerCase().includes('busy') ||
        reason.toLowerCase().includes('networkerror')

      const delay = getBackoffDelay(reconnectAttempts.current, isZombieError)

      if (isMounted.current) {
        setStatus(
          isZombieError
            ? BluetoothConnectionStatus.CONNECTING
            : BluetoothConnectionStatus.RECONNECTING
        )
      }

      const statusMessage = isZombieError
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

      setCustomStatusMessage(statusMessage)

      reconnectTimeoutRef.current = setTimeout(() => {
        if (
          statusRef.current !== BluetoothConnectionStatus.CONNECTED &&
          !isConnecting.current &&
          !isDisconnecting.current &&
          !isManualDisconnect.current
        ) {
          if (device.gatt?.connected) {
            logger.info('Device already connected, skipping reconnect attempt.')
            if (isMounted.current) {
              setStatus(BluetoothConnectionStatus.CONNECTED)
            }
            return
          }

          connectToGattRef.current?.(device, true).catch((error: unknown) => {
            logger.warn({ error }, 'Reconnect attempt failed')
            reconnect(
              device,
              error instanceof Error ? error.message : String(error)
            )
          })
        }
      }, delay)
    },
    []
  )

  const onDisconnected = useCallback(
    (event: Event | undefined) => {
      const device = (event?.target as BluetoothDevice) ?? deviceRef.current
      if (!device) {
        logger.warn('onDisconnected called without a device reference.')
        return
      }

      logger.info(
        {
          device: device.name,
          manual: isManualDisconnect.current,
          timeout: isTimeoutDisconnect.current,
        },
        'Device disconnected'
      )
      setBatteryLevel(null)

      if (isManualDisconnect.current) {
        logger.info('Not attempting to reconnect (manual disconnect).')
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        reconnectAttempts.current = 0
        if (reconnectTimeoutRef.current)
          clearTimeout(reconnectTimeoutRef.current)
        return
      }

      // Visibility check to avoid background reconnection thrashing
      // We allow background reconnection if a workout is active
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible' &&
        !isWorkoutActive
      ) {
        logger.info(
          'Tab is backgrounded and no workout active. Skipping auto-reconnect.'
        )
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        setCustomStatusMessage(BLUETOOTH_MESSAGES.backgroundReconnectDisabled)
        return
      }

      // Connection Storm Prevention:
      // If disconnect happens within threshold of a successful connect, abort and notify user.
      const now = Date.now()
      const timeSinceConnect = now - lastConnectTimeRef.current
      if (
        lastConnectTimeRef.current > 0 &&
        timeSinceConnect < CONNECTION_STORM_THRESHOLD_MS
      ) {
        logger.warn(
          { timeSinceConnect },
          'Connection storm detected. Aborting auto-reconnect.'
        )
        setStatus(BluetoothConnectionStatus.ERROR)
        setCustomStatusMessage(BLUETOOTH_MESSAGES.connectionStormDetected)
        return
      }

      setStatus(BluetoothConnectionStatus.DISCONNECTED)

      // Start the reconnection process
      reconnectAttempts.current = 0
      reconnect(device, 'Connection lost')
    },
    [reconnect, isWorkoutActive]
  )

  // Cleanup
  useEffect(() => {
    isMounted.current = true
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
      // Clean up the disconnected listener to prevent leaks across remounts
      if (deviceRef.current && activeDisconnectListenerRef.current) {
        deviceRef.current.removeEventListener(
          'gattserverdisconnected',
          activeDisconnectListenerRef.current
        )
        activeDisconnectListenerRef.current = null
      }

      // This allows auto-reconnect to work properly on component remount
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)

      isMounted.current = false

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
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice, isReconnect = false) => {
      if (isConnecting.current || isDisconnecting.current) {
        logger.warn(
          { device: device.name },
          'Connection or disconnection in progress. Skipping.'
        )
        return false
      }

      // Ensure any previous connection attempt is aborted
      if (abortControllerRef.current) {
        logger.warn(
          { device: device.name },
          'Aborting previous pending connection attempt'
        )
        abortControllerRef.current.abort()
      }

      isConnecting.current = true
      abortControllerRef.current = new AbortController()

      try {
        deviceRef.current = device

        if (!isReconnect) {
          if (isMounted.current) {
            setStatus(BluetoothConnectionStatus.CONNECTING)
            setCustomStatusMessage(
              BLUETOOTH_MESSAGES.connectingToDevice(device.name || '')
            )
          }
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
            const isBusy =
              String(error).includes('busy') ||
              String(error).includes('NetworkError')
            if (isBusy && attempt < FAST_RECONNECT_MAX_ATTEMPTS) {
              logger.warn(
                { device: device.name, attempt },
                'GATT connection busy, fast-retrying...'
              )
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

        // Attach disconnect listener immediately after successful GATT connection
        // This ensures we catch disconnections that might occur during service discovery
        if (activeDisconnectListenerRef.current) {
          // If we are connecting to a new device, we should remove the listener from the OLD device (deviceRef.current)
          // or the current device if it's a reconnect. To be safe, try removing from both if they differ.
          const oldDevice = deviceRef.current
          if (oldDevice) {
            oldDevice.removeEventListener(
              'gattserverdisconnected',
              activeDisconnectListenerRef.current
            )
          }
          // Also try removing from the new device just in case
          if (device !== oldDevice) {
            device.removeEventListener(
              'gattserverdisconnected',
              activeDisconnectListenerRef.current
            )
          }
        }
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
          batteryChar.addEventListener(
            'characteristicvaluechanged',
            (e: unknown) => {
              const event = e as Event
              const target = event.target as BluetoothRemoteGATTCharacteristic
              setBatteryLevel(target.value!.getUint8(0))
            }
          )
        } catch {
          /* Battery service optional */
        }

        await characteristic.startNotifications()
        setIsDataStale(false)

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event: unknown) => {
            const now = Date.now()

            // Calculate Delta (Period) for Signal Quality
            if (lastDataTime.current > 0) {
              const delta = now - lastDataTime.current
              updateSignalPeriod(delta)
            }

            const e = event as Event
            const target = e.target as BluetoothRemoteGATTCharacteristic
            const value = target.value
            if (!value) {
              logger.warn(
                'Received characteristic value changed event with no value.'
              )
              return
            }
            const heartRate = parseHeartRate(value)
            lastDataTime.current = now // Update timestamp for next delta
            logger.debug(
              { heartRate },
              'Heart rate data received from Bluetooth'
            )
            onHeartRateUpdateRef.current?.(heartRate)
          }
        )

        if (isMounted.current) {
          setStatus(BluetoothConnectionStatus.CONNECTED)
          setCustomStatusMessage(
            BLUETOOTH_MESSAGES.connectedToDevice(device.name || '')
          )
        }
        setSavedDevice(device)
        setCookie('hrm_device_id', device.id)
        isManualDisconnect.current = false
        isTimeoutDisconnect.current = false
        reconnectAttempts.current = 0
        lastConnectTimeRef.current = Date.now()
        onConnectRef.current?.()
        return true
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const errorName = error instanceof DOMException ? error.name : 'Error'

        const isIntentionalAbort =
          errorName === 'AbortError' &&
          abortControllerRef.current?.signal.aborted

        const isGattDisconnected =
          errorMsg.includes('GATT Server is disconnected') ||
          errorMsg.includes('GATT operation failed')

        if (!isIntentionalAbort) {
          logger.error(
            { errorName, errorMsg, device: device.name },
            'GATT Connection failed'
          )
        }

        if (device.gatt?.connected) {
          logger.info('Ensuring GATT disconnection after failure...')
          device.gatt.disconnect()
          return false // Let onDisconnected handle the retry/cleanup
        }

        if (errorMsg.includes('timeout')) {
          logger.error(
            { device: device.name },
            'Connection timeout detected. Resetting device and permissions.'
          )
          if (isMounted.current) {
            setStatus(BluetoothConnectionStatus.ERROR)
            setCustomStatusMessage(BLUETOOTH_MESSAGES.connectionTimeoutReset)
          }
          reconnectAttempts.current = BLUETOOTH_MAX_RECONNECT_ATTEMPTS
          deviceRef.current = null

          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(async () => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            await disconnect()
            setCookie('hrm_device_id', '', -1)
            setCustomStatusMessage(BLUETOOTH_MESSAGES.devicePermissionsRevoked)
            reconnectAttempts.current = 0
          }, PERMISSIONS_REVOKED_TIMEOUT_MS)
        } else if (isGattDisconnected) {
          logger.warn(
            { device: device.name },
            'Device disconnected during connection. Will attempt auto-reconnect.'
          )
          deviceRef.current = null
        } else if (!isIntentionalAbort) {
          deviceRef.current = null
        }

        throw error
      } finally {
        // This is reset at the end of the function, but if an abort happens,
        // we need to ensure it's also reset.
        isConnecting.current = false
      }
    },
    [onDisconnected, updateSignalPeriod, disconnect]
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
      if (isConnecting.current || isDisconnecting.current) {
        logger.warn('Connection or disconnection in progress. Skipping.')
        return false
      }

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
    if (isConnecting.current || isDisconnecting.current) return

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
    bluetoothStatus: status,
    isDataStale,
    isSupported, // Export this flag
    signalPeriodMs,
    connectionAttempted,
  }
}

export default useBluetoothHRM
