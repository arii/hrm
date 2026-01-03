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
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'
import { getCookie, setCookie } from '@/utils/cookies'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

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
}

/**
 * @typedef {'manual' | 'timeout' | 'signal_loss' | null} DisconnectionReason
 * @description Represents the reason for a device disconnection.
 * - `manual`: The user explicitly called the `disconnect` function.
 * - `timeout`: The connection was dropped due to stale data (no heart rate updates received).
 * - `signal_loss`: The device's `gattserverdisconnected` event was fired unexpectedly.
 * - `null`: The device is connected or has not yet been disconnected.
 */
type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss' | null

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
 * @property {DisconnectionReason} disconnectionReason - The reason for the last disconnection.
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
  } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isDataStale, setIsDataStale] = useState(false)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const statusRef = useRef(deviceStatus)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const isTimeoutDisconnect = useRef(false)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnecting = useRef(false)
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

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

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

    if (deviceStatus.startsWith('Connected')) {
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
  }, [userName, userAge, deviceStatus, sendData])

  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

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
        statusRef.current.startsWith('Connected') &&
        lastDataTime.current > 0
      ) {
        const timeSinceLastData = Date.now() - lastDataTime.current

        // Mark as stale and show visual feedback when timeout is reached
        if (timeSinceLastData > dataLivenessTimeoutMs && !isDataStale) {
          setIsDataStale(true)
          setDeviceStatus('Connection unstable. Reconnecting...')
          setDisconnectionReason('timeout')
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

  /**
   * @function disconnect
   * @description Manually disconnects the device, preventing auto-reconnection.
   * @sideeffect Clears connection timeouts and resets device state.
   */
  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    setDisconnectionReason('manual')
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect()

    // Send a 'null' heart rate value to signal disconnection to the server
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    setDeviceStatus('Disconnected')
    setSavedDevice(null)
    setBatteryLevel(null)
    deviceRef.current = null
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
      setDeviceStatus('Device permissions revoked. Ready for new connection.')
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setDeviceStatus('Error clearing device permissions.')
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
    setDeviceStatus(`Failed: ${msg}`)
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
          setDisconnectionReason('signal_loss')
        }
        const reasonText = isTimeoutDisconnect.current
          ? 'Timeout'
          : 'Signal Lost'
        setDeviceStatus(
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
        setDeviceStatus(
          `Failed to reconnect after ${maxReconnectAttempts} attempts. Resetting device...`
        )

        // Trigger device reset after a brief delay to show the message
        reconnectTimeoutRef.current = setTimeout(async () => {
          isManualDisconnect.current = true
          isTimeoutDisconnect.current = false
          setDisconnectionReason('manual')
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
          setCookie('hrm_device_id', '', -1)
          setDeviceStatus(
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
      setDeviceStatus('Disconnected')
      reconnectAttempts.current = 0
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      // Only abort an existing connection attempt if it's for a different device
      if (
        abortControllerRef.current &&
        deviceRef.current?.id !== device.id &&
        isConnecting.current
      ) {
        abortControllerRef.current.abort()
      }
      try {
        isConnecting.current = true
        deviceRef.current = device
        setDeviceStatus(`Connecting to: ${device.name || 'Device'}...`)

        abortControllerRef.current = new AbortController()
        const server = await cancellablePromise(device.gatt!.connect(), {
          timeoutMs: 30000, // 30s timeout - some devices are slow to respond
          errorMessage: 'GATT connection timeout',
          signal: abortControllerRef.current.signal,
        })

        // Attach disconnect listener immediately after successful GATT connection
        // This ensures we catch disconnections that might occur during service discovery
        device.addEventListener('gattserverdisconnected', onDisconnected)

        const service = await server.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        try {
          const batteryService =
            await server.getPrimaryService(BATTERY_SERVICE_UUID)
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
            const e = event as Event
            const target = e.target as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)
            lastDataTime.current = Date.now()
            logger.info(
              { heartRate },
              'Heart rate data received from Bluetooth'
            )
            onHeartRateUpdateRef.current?.(heartRate)
          }
        )

        setDeviceStatus(`Connected to: ${device.name}`)
        setSavedDevice(device)
        setCookie('hrm_device_id', device.id)
        isManualDisconnect.current = false
        isTimeoutDisconnect.current = false
        setDisconnectionReason(null)
        // Reset reconnection attempts on successful connection
        reconnectAttempts.current = 0
        return true
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const errorName = error instanceof DOMException ? error.name : 'Error'

        // Log to console for debugging only - don't show popups
        logger.error(
          { errorName, errorMsg, device: device.name },
          'GATT Connection failed'
        )

        // Timeout errors indicate device is not responding - reset immediately
        if (errorMsg.includes('timeout')) {
          logger.error(
            { device: device.name },
            'Connection timeout detected. Resetting device and permissions.'
          )
          setDeviceStatus('Connection timeout. Resetting device...')
          reconnectAttempts.current = maxReconnectAttempts // Force immediate reset
          deviceRef.current = null

          // Trigger device reset after brief delay to show message
          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
            isManualDisconnect.current = true
            isTimeoutDisconnect.current = false
            setDisconnectionReason('manual')
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            setCookie('hrm_device_id', '', -1)
            setDeviceStatus(
              'Device permissions revoked. Ready for new connection.'
            )
            setSavedDevice(null)
            setBatteryLevel(null)
            deviceRef.current = null
            reconnectAttempts.current = 0
          }, 2000)
        } else {
          // Clear the failed device reference so we don't try to reconnect to it
          deviceRef.current = null
        }

        throw error
      } finally {
        isConnecting.current = false
      }
    },
    [onDisconnected]
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

      if (statusRef.current.startsWith('Connected')) return
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
        setDeviceStatus('Checking saved devices...')
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
          setDeviceStatus('Scanning for devices...')
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
        if (!silent) {
          handleConnectionError(error)
        } else {
          logger.info({ error, errorMsg }, 'Silent auto-connect failed.')
          // Reset the status to allow for a manual connection attempt.
          setDeviceStatus('Disconnected')
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
      setDeviceStatus('Connecting to saved device...')
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
      setDeviceStatus(
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
    isConnected: deviceStatus.startsWith('Connected'),
    isDataStale,
    isSupported, // Export this flag
    disconnectionReason,
  }
}

export default useBluetoothHRM
