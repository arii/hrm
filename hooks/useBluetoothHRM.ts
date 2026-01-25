/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss.
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import { BluetoothConnectionStatus } from '../types/bluetooth'
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'
import { getCookie, setCookie } from '@/utils/cookies'

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: 'Disconnected',
  [BluetoothConnectionStatus.CONNECTING]: 'Connecting...',
  [BluetoothConnectionStatus.CONNECTED]: 'Connected',
  [BluetoothConnectionStatus.RECONNECTING]: 'Reconnecting...',
  [BluetoothConnectionStatus.ERROR]: 'Error',
}

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

// Constants for signal quality calculation
const ROLLING_AVG_HISTORY_LENGTH = 5
const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500
const MIN_MISSED_PACKET_THRESHOLD_MS = 1500
const HEARTBEAT_INTERVAL_MS = 1000

/**
 * @function parseHeartRate
 * @description Parses the heart rate value from the raw DataView received from a BLE device.
 * It handles both 8-bit and 16-bit heart rate value formats based on the flags.
 * @param {DataView} value - The raw data from the heart rate measurement characteristic.
 * @returns {number} The parsed heart rate in beats per minute.
 */
const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}
/**
 * @interface UseBluetoothHRMProps
 * @description Props for configuring the useBluetoothHRM hook.
 */
interface UseBluetoothHRMProps {
  /**
   * @property {number} [dataLivenessTimeoutMs=10000]
   * @description The timeout in milliseconds for determining if the Bluetooth data stream is stale.
   * If no new data is received within this period, the hook will attempt to reconnect.
   * A value of 0 disables this feature.
   */
  dataLivenessTimeoutMs?: number
  /**
   * @property {number} [throttleMs=250]
   * @description The frequency in milliseconds at which to throttle heart rate updates.
   * A lower value will send more frequent updates, while a higher value will send fewer.
   */
  throttleMs?: number
  userName?: string | null
  userAge?: number | null
  onHeartRateUpdate?: (heartRate: number) => void
  onConnect?: () => void
}

/**
 * @hook useBluetoothHRM
 * @description A comprehensive hook for managing Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It handles device discovery, connection, data streaming, and automatic reconnection.
 *
 * @param {UseBluetoothHRMProps} props - Configuration properties for the hook.
 *
 * @returns {object} An object containing functions and state for managing a Bluetooth HRM device.
 * @property {Function} connectAndStream - Initiates device connection and data streaming.
 * @property {Function} disconnect - Manually disconnects the device.
 * @property {Function} forgetDevice - Disconnects and forgets the device.
 * @property {string} deviceStatus - A human-readable string of the current connection status.
 * @property {number | null} batteryLevel - The device's battery level (0-100), or null if unavailable.
 * @property {boolean} isConnected - True if the device is connected and streaming.
 * @property {boolean} isSupported - True if the browser supports the Web Bluetooth API.
 *
 * @example
 * ```tsx
 * const {
 *   connectAndStream,
 *   disconnect,
 *   deviceStatus,
 *   isConnected,
 *   batteryLevel
 * } = useBluetoothHRM({ dataLivenessTimeoutMs: 5000 });
 *
 * return (
 *   <div>
 *     <p>Device Status: {deviceStatus}</p>
 *     <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
 *     {batteryLevel && <p>Battery: {batteryLevel}%</p>}
 *     <button onClick={() => connectAndStream('John Doe', 30)}>Connect</button>
 *     <button onClick={disconnect}>Disconnect</button>
 *   </div>
 * );
 * ```
 */
const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = 10000,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
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
  const maxReconnectAttempts = 5
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnecting = useRef(false)

  // Centralized function to update the signal period history and state
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

  /**
   * @ref abortControllerRef
   * @description Manages the cancellation of in-flight Bluetooth connection attempts.
   * This is crucial for handling timeouts and preventing race conditions where multiple
   * connection attempts (e.g., auto-reconnect vs. manual) might overlap.
   * - It is created and assigned in `connectToGatt`.
   * - It is aborted in `disconnect` to stop any ongoing connection attempts.
   * - It is also aborted at the start of `connectToGatt` to cancel any previous,
   *   still-pending connection attempts before starting a new one.
   */
  const abortControllerRef = useRef<AbortController | null>(null)
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)
  const onConnectRef = useRef(onConnect)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  // Keep track of the latest sendData function to avoid stale closures
  const sendDataRef = useRef(sendData)
  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  useEffect(() => {
    userDetailsRef.current = { name: userName || '', age: userAge || 0 }
  }, [userName, userAge])

  useEffect(() => {
    // Keep the ref updated if props change
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

  // Cleanup
  useEffect(() => {
    // Reset the manual disconnect flag on mount to allow auto-reconnect after page refresh
    isManualDisconnect.current = false

    return () => {
      // Clear timeouts on unmount, but don't mark as manual disconnect
      // This allows auto-reconnect to work properly on component remount
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  // Watchdog for stale data - marks data as stale and triggers reconnection based on timeout
  useEffect(() => {
    // A timeout of 0 disables the watchdog
    if (!dataLivenessTimeoutMs) return

    // This interval periodically checks if new data has been received.
    const interval = setInterval(() => {
      if (
        statusRef.current === BluetoothConnectionStatus.CONNECTED &&
        lastDataTime.current > 0
      ) {
        const timeSinceLastData = Date.now() - lastDataTime.current

        // Mark as stale and show visual feedback when timeout is reached
        if (timeSinceLastData > dataLivenessTimeoutMs && !isDataStale) {
          setIsDataStale(true)
          setStatus(BluetoothConnectionStatus.RECONNECTING)
          setCustomStatusMessage('Connection unstable. Reconnecting...')
          isTimeoutDisconnect.current = true
          if (deviceRef.current?.gatt?.connected)
            deviceRef.current.gatt.disconnect()
        } else if (timeSinceLastData <= dataLivenessTimeoutMs && isDataStale) {
          setIsDataStale(false)
        }
      }
    }, 2000) // Check every 2s
    return () => clearInterval(interval)
  }, [dataLivenessTimeoutMs, isDataStale])

  // Heartbeat for proactive signal quality assessment
  useEffect(() => {
    const heartbeat = setInterval(() => {
      // Only run when connected and not already stale
      if (
        statusRef.current !== BluetoothConnectionStatus.CONNECTED ||
        isDataStale ||
        lastDataTime.current === 0
      ) {
        return
      }

      const now = Date.now()
      const timeSinceLastData = now - lastDataTime.current

      // If the time since the last packet exceeds the current average + a buffer,
      // it's likely a packet was missed.
      const threshold = Math.max(
        avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
        MIN_MISSED_PACKET_THRESHOLD_MS
      )

      if (timeSinceLastData > threshold) {
        updateSignalPeriod(timeSinceLastData)
        // By updating the period here, we make the signal indicator degrade
        // proactively, without waiting for the next actual packet.
      }
    }, HEARTBEAT_INTERVAL_MS) // Check every second

    return () => clearInterval(heartbeat)
  }, [isDataStale, updateSignalPeriod])

  /**
   * @function disconnect
   * @description Manually disconnects the device, preventing auto-reconnection.
   * @sideeffect Clears connection timeouts and resets device state.
   */
  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect()

    // Send a 'null' heart rate value to signal disconnection to the server
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(null)
    setSavedDevice(null)
    setBatteryLevel(null)
    deviceRef.current = null
    periodHistory.current = []
    avgPeriodMs.current = 0
    setSignalPeriodMs(0)
  }, [])

  /**
   * @function forgetDevice
   * @description Disconnects, clears the saved device from cookies, and revokes permissions.
   * @async
   * @returns {Promise<void>}
   * @sideeffect Calls `disconnect`, deletes cookies, and may call `device.forget()`.
   */
  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    try {
      setCookie('hrm_device_id', '', -1)
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(
        'Device permissions revoked. Ready for new connection.'
      )
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage('Error clearing device permissions.')
    }
  }, [disconnect])

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = 'An unknown error occurred.'
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        msg = 'Connection cancelled. No device selected.'
      } else if (error.name === 'SecurityError') {
        msg = 'Security error. Use HTTPS or localhost.'
      } else if (error.name === 'NetworkError') {
        msg = 'Connection failed. Device might be too far or low battery.'
      } else {
        msg = `Bluetooth error: ${error.name}`
      }
    } else if (error instanceof Error) {
      // Handle our custom timeout error
      if (error.message.includes('timeout')) {
        msg = 'Connection timed out. Wake up device and try again.'
      } else {
        msg = `Error: ${error.message}`
      }
    }
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(`Failed: ${msg}`)
    logger.error({ error }, msg)
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)

    // Also send a null HR value to signal immediate disconnection
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    if (
      !isManualDisconnect.current &&
      deviceRef.current &&
      !isConnecting.current
    ) {
      reconnectAttempts.current += 1
      const device = deviceRef.current
      const attemptNum = reconnectAttempts.current

      logger.info(
        {
          device: device.name,
          attempt: attemptNum,
          maxAttempts: maxReconnectAttempts,
        },
        'Device disconnected, attempting auto-reconnect...'
      )

      if (attemptNum <= maxReconnectAttempts) {
        // Only set signal_loss if this wasn't a timeout disconnect
        if (!isTimeoutDisconnect.current) {
          // No longer need to set a reason
        }
        const reasonText = isTimeoutDisconnect.current
          ? 'Timeout'
          : 'Signal Lost'
        setStatus(BluetoothConnectionStatus.RECONNECTING)
        setCustomStatusMessage(
          `${reasonText}. Reconnecting... (Attempt ${attemptNum}/${maxReconnectAttempts})`
        )

        // Randomized backoff: increases with attempts
        const baseDelay = 1000 + (attemptNum - 1) * 500 // 1s, 1.5s, 2s, 2.5s, 3s
        const randomDelay = baseDelay + Math.random() * 1000

        reconnectTimeoutRef.current = setTimeout(() => {
          if (connectToGattRef.current) {
            connectToGattRef.current(device).catch((error) => {
              if (error.name !== 'AbortError') {
                logger.error(
                  { error, device: device.name, attempt: attemptNum },
                  'Auto-reconnect attempt failed'
                )
              }
            })
          }
        }, randomDelay)
      } else {
        // Max reconnection attempts reached - reset device and permissions
        logger.error(
          { device: device.name, maxAttempts: maxReconnectAttempts },
          'Max reconnection attempts reached. Resetting device.'
        )
        setStatus(BluetoothConnectionStatus.ERROR)
        setCustomStatusMessage(
          `Failed to reconnect after ${maxReconnectAttempts} attempts. Resetting device...`
        )

        // Trigger device reset after a brief delay to show the message
        reconnectTimeoutRef.current = setTimeout(async () => {
          isManualDisconnect.current = true
          isTimeoutDisconnect.current = false
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
          setCookie('hrm_device_id', '', -1)
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          setCustomStatusMessage(
            'Device permissions revoked. Ready for new connection.'
          )
          setSavedDevice(null)
          setBatteryLevel(null)
          deviceRef.current = null
          reconnectAttempts.current = 0
        }, 2000)
      }
    } else {
      logger.info('Device disconnected manually.')
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(null)
      reconnectAttempts.current = 0
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      // If a connection is already in progress, abort it before starting a new one
      if (isConnecting.current) {
        logger.warn(
          { device: device.name },
          'Aborting previous pending connection attempt'
        )
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
      try {
        isConnecting.current = true
        deviceRef.current = device
        setStatus(BluetoothConnectionStatus.CONNECTING)
        setCustomStatusMessage(`Connecting to: ${device.name || 'Device'}...`)

        // Create a new AbortController for this connection attempt
        abortControllerRef.current = new AbortController()

        // --- START NEW RETRY LOGIC ---
        let server: BluetoothRemoteGATTServer | undefined
        let attempt = 0
        const maxRetries = 3

        while (true) {
          try {
            // Attempt the connection
            server = await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: 30000,
              errorMessage: 'GATT connection timeout',
              signal: abortControllerRef.current.signal,
            })
            // If we get here, connection succeeded!
            break
          } catch (error) {
            const err = error as DOMException | Error
            const errorName = 'name' in err ? err.name : 'Error'
            const errorMsg = err.message || ''

            // Check if this is the "Zombie" error (NetworkError or "out of range")
            // This is the specific error Android throws when the device is busy with the old page
            const isZombieError =
              errorName === 'NetworkError' ||
              errorMsg.includes('range') ||
              errorMsg.includes('busy')

            // If it's a zombie error and we haven't given up yet...
            if (
              isZombieError &&
              attempt < maxRetries &&
              !abortControllerRef.current.signal.aborted
            ) {
              attempt++
              const delayMs = Math.pow(2, attempt) * 1000
              logger.warn(
                { device: device.name, attempt, delayMs, errorMsg },
                'Device likely busy (Zombie connection). Retrying with exponential backoff...'
              )
              setStatus(BluetoothConnectionStatus.CONNECTING)
              setCustomStatusMessage(
                `Device busy (Zombie). Retrying in ${delayMs / 1000}s... (${attempt}/${maxRetries})`
              )

              // Exponential backoff: 2s, 4s, 8s to let the Android Bluetooth stack clear the connection
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue // Try again
            } else {
              // If it's a different error, or we ran out of retries, fail for real
              throw error
            }
          }
        }
        // --- END NEW RETRY LOGIC ---

        if (abortControllerRef.current?.signal.aborted) {
          server?.disconnect()
          throw new DOMException('Connection aborted', 'AbortError')
        }

        // Attach disconnect listener immediately after successful GATT connection
        // This ensures we catch disconnections that might occur during service discovery
        device.addEventListener('gattserverdisconnected', onDisconnected)

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
        } catch (_err) {
          /* Battery service optional */
        }

        await characteristic.startNotifications()
        lastDataTime.current = Date.now()
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
            const heartRate = parseHeartRate(target.value!)
            lastDataTime.current = now // Update timestamp for next delta
            logger.debug(
              { heartRate },
              'Heart rate data received from Bluetooth'
            )
            onHeartRateUpdateRef.current?.(heartRate)
          }
        )

        setStatus(BluetoothConnectionStatus.CONNECTED)
        setCustomStatusMessage(`Connected to: ${device.name}`)
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

        if (errorMsg.includes('timeout')) {
          logger.error(
            { device: device.name },
            'Connection timeout detected. Resetting device and permissions.'
          )
          setStatus(BluetoothConnectionStatus.ERROR)
          setCustomStatusMessage('Connection timeout. Resetting device...')
          reconnectAttempts.current = maxReconnectAttempts
          deviceRef.current = null

          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
            isManualDisconnect.current = true
            isTimeoutDisconnect.current = false
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            setCookie('hrm_device_id', '', -1)
            setStatus(BluetoothConnectionStatus.DISCONNECTED)
            setCustomStatusMessage(
              'Device permissions revoked. Ready for new connection.'
            )
            setSavedDevice(null)
            setBatteryLevel(null)
            deviceRef.current = null
            reconnectAttempts.current = 0
          }, 2000)
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
        isConnecting.current = false
      }
    },
    [onDisconnected, updateSignalPeriod]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  /**
   * @function connectAndStream
   * @description Connects to a Bluetooth HRM device and starts streaming data.
   * It attempts to reconnect to a saved device or prompts the user to select a new one.
   *
   * @param {string} [userName] - The user's name for display.
   * @param {number} [userAge] - The user's age to calculate max heart rate.
   * @returns {Promise<void>} A promise that resolves on successful connection, or rejects on failure.
   * @throws {Error} If the connection fails for any reason (e.g., WebSocket disconnected,
   * device not found, user cancellation).
   * @sideeffect May trigger the browser's Bluetooth device picker.
   * @sideeffect Updates component state throughout the connection process.
   */
  const connectAndStream = useCallback(
    async (
      userNameFromArgs?: string,
      userAgeFromArgs?: number,
      options: { silent?: boolean } = {}
    ): Promise<void> => {
      const { silent = false } = options

      // Prioritize args, but fall back to props.
      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (statusRef.current === BluetoothConnectionStatus.CONNECTED) return
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
        setCustomStatusMessage('Checking saved devices...')
        let device = savedDevice

        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
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
              return
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
          setCustomStatusMessage('Scanning for devices...')
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          logger.info({ device: device.name }, 'Connecting to device')
          await connectToGatt(device)
        } else {
          logger.info('No device to connect')
        }
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
          setCustomStatusMessage(null)
        }
        if (!silent) {
          throw error
        }
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
    // Try to auto-connect to a saved device. This is a critical function for user experience.
    // We want it to succeed silently if possible, but still provide feedback if it fails.
    try {
      logger.info('Starting auto-connect to saved device...')
      setStatus(BluetoothConnectionStatus.CONNECTING)
      setCustomStatusMessage('Connecting to saved device...')
      await connectAndStream(undefined, undefined, { silent: true })
      logger.info('Auto-connect succeeded')
    } catch (error) {
      // Silent failure is OK - user can manually connect if needed
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.info(
        { errorMsg },
        'Auto-connect failed, user can connect manually'
      )
      // Set status back to allow manual connection
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(
        'Auto-connect failed. Use Connect button to select device.'
      )
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
    status,
  }
}

export default useBluetoothHRM
