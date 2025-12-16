// File: hooks/useBluetoothHRM.ts
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmInputData,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'

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
 * @function setCookie
 * @description Sets a browser cookie with a specified name, value, and expiration.
 * This function is a no-op in non-browser environments.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value to store in the cookie.
 * @param {number} [days=365] - The number of days until the cookie expires.
 * @sideeffect Creates or updates a cookie in `document.cookie`.
 */
const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/`
  }
}

/**
 * @function getCookie
 * @description Retrieves the value of a cookie by its name.
 * Returns an empty string if the cookie is not found or in a non-browser environment.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string} The decoded value of the cookie.
 */
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name && parts[1] ? decodeURIComponent(parts[1]) : r
  }, '')
}

/**
 * @function withTimeout
 * @description A utility that races a promise against a timeout.
 * If the promise does not resolve or reject within the specified time, the returned promise
 * will reject with a custom timeout error message.
 * @template T
 * @param {Promise<T>} promise - The promise to race against the timeout.
 * @param {number} ms - The timeout duration in milliseconds.
 * @param {string} msg - The error message to use if the timeout is reached.
 * @returns {Promise<T>} A promise that resolves with the original promise's value or rejects
 * if the original promise rejects or the timeout is exceeded.
 */
const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  msg: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(msg)), ms)
    promise.then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
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
  const { dataLivenessTimeoutMs = 10000 } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const statusRef = useRef(deviceStatus)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const userDetailsRef = useRef<{ name: string; age: number } | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)

  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

  // Cleanup
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (deviceRef.current?.gatt?.connected)
        deviceRef.current.gatt.disconnect()
    }
  }, [])

  // Watchdog for stale data
  useEffect(() => {
    // A timeout of 0 disables the watchdog
    if (!dataLivenessTimeoutMs) return

    const interval = setInterval(() => {
      if (
        statusRef.current.startsWith('Connected') &&
        lastDataTime.current > 0
      ) {
        if (Date.now() - lastDataTime.current > dataLivenessTimeoutMs) {
          logger.warn('Bluetooth data stale. Forcing reconnection...')
          setDisconnectionReason('timeout')
          setDeviceStatus('Connection unstable. Reconnecting...')
          if (deviceRef.current?.gatt?.connected)
            deviceRef.current.gatt.disconnect()
        }
      }
    }, 2000) // Check every 2s
    return () => clearInterval(interval)
  }, [dataLivenessTimeoutMs])

  /**
   * @function disconnect
   * @description Manually disconnects from the currently connected Bluetooth device.
   * This is treated as a manual action and will prevent automatic reconnection attempts.
   * Resets the device status, saved device, and battery level.
   * @sideeffect Clears any pending reconnection timeouts.
   * @sideeffect Disconnects the GATT server if connected.
   * @sideeffect Updates component state for status, saved device, and battery level.
   */
  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    setDisconnectionReason('manual')
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect()

    setDeviceStatus('Disconnected')
    setSavedDevice(null)
    setBatteryLevel(null)
    deviceRef.current = null
  }, [])

  /**
   * @function forgetDevice
   * @description Disconnects from the device, clears any saved device ID from cookies,
   * and attempts to use the `device.forget()` API to revoke permissions for all previously
   * granted Bluetooth devices.
   * @async
   * @returns {Promise<void>} A promise that resolves when the forget operation is complete.
   * @sideeffect Calls the `disconnect` function.
   * @sideeffect Deletes the 'hrm_device_id' cookie.
   * @sideeffect Calls `device.forget()` on all granted Bluetooth devices.
   * @sideeffect Updates the device status message.
   */
  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    try {
      setCookie('hrm_device_id', '', -1)
      if (navigator.bluetooth && navigator.bluetooth.getDevices) {
        const devices = await navigator.bluetooth.getDevices()
        for (const device of devices) {
          if (device.forget) await device.forget()
        }
      }
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
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)
    if (!isManualDisconnect.current && deviceRef.current) {
      logger.info(
        { device: deviceRef.current.name },
        'Device disconnected, attempting auto-reconnect...'
      )
      setDisconnectionReason('signal_loss')
      setDeviceStatus('Signal Lost. Retrying...')
      const deviceToReconnect = deviceRef.current
      reconnectTimeoutRef.current = setTimeout(() => {
        if (connectToGattRef.current)
          connectToGattRef.current(deviceToReconnect)
      }, 2000)
    } else {
      logger.info('Device disconnected manually.')
      setDeviceStatus('Disconnected')
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      try {
        deviceRef.current = device
        setDeviceStatus(`Connecting to: ${device.name || 'Device'}...`)

        // Use a timeout for the initial GATT connection to avoid infinite hanging
        // 10 seconds is usually enough for a healthy BLE connection
        const server = await withTimeout(
          device.gatt!.connect(),
          10000,
          'GATT connection timeout'
        )

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

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event: unknown) => {
            const e = event as Event
            const target = e.target as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)
            lastDataTime.current = Date.now()

            const { name, age } = userDetailsRef.current || {}
            const calculatedMaxHr = calculateMaxHr(age)

            const metadataData: HrmMetadataUpdateData = {
              maxHr: calculatedMaxHr,
              name: name || `Bluetooth HRM (${device.name || 'Unknown'})`,
            }
            if (typeof age === 'number') {
              metadataData.age = age
            }

            const metadata: HrmMetadataUpdateMessage = {
              type: 'HRM_METADATA_UPDATE',
              data: metadataData,
            }
            sendData(metadata)

            const data: HrmInputData = {
              value: heartRate,
            }

            sendData({
              type: 'HRM_INPUT',
              data,
            })
          }
        )

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setDeviceStatus(`Connected to: ${device.name}`)
        setSavedDevice(device)
        setCookie('hrm_device_id', device.id)
        isManualDisconnect.current = false
        setDisconnectionReason(null)
        return true
      } catch (error) {
        logger.error({ error, device: device.name }, 'GATT Connection failed')
        throw error
      }
    },
    [onDisconnected, sendData]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  /**
   * @function connectAndStream
   * @description Initiates the process of connecting to a Bluetooth HRM device and streaming data.
   * It first checks for a previously saved device and attempts to reconnect. If no device is saved,
   * it opens the browser's device picker UI for the user to select a new device.
   *
   * @param {string} [userName] - The name of the user, used for display purposes.
   * @param {number} [userAge] - The age of the user, used to calculate max heart rate.
   * @returns {Promise<boolean>} A promise that resolves to `true` if the connection is successful,
   * and `false` otherwise.
   * @sideeffect Updates user details ref for use in data streaming.
   * @sideeffect May trigger the browser's Bluetooth device picker.
   * @sideeffect Updates component state to reflect the connection process.
   */
  const connectAndStream = useCallback(
    async (userName?: string, userAge?: number): Promise<boolean> => {
      userDetailsRef.current = {
        name: userName || '',
        age: userAge || 0,
      }
      if (statusRef.current.startsWith('Connected')) return true
      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return false
      }

      try {
        setDeviceStatus('Checking saved devices...')
        let device = savedDevice

        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            const foundDevice = devices.find((d) => d.id === savedDeviceId)

            if (foundDevice) {
              try {
                await connectToGatt(foundDevice)
                return true
              } catch (err) {
                logger.warn(
                  { error: err },
                  'Reconnect failed, clearing preference'
                )
                setCookie('hrm_device_id', '', -1)
              }
            }
          }
        }

        if (!device) {
          setDeviceStatus('Scanning for devices...')
          try {
            // Note: acceptAllDevices is an alternative if filters fail,
            // but strict filtering is better for UX to avoid showing non-HRM devices.
            device = await navigator.bluetooth.requestDevice({
              filters: [{ services: [HR_SERVICE_UUID] }],
              optionalServices: [BATTERY_SERVICE_UUID],
            })
          } catch (scanErr) {
            handleConnectionError(scanErr)
            return false
          }
        }

        if (device) {
          await connectToGatt(device)
          return true
        }
        return false
      } catch (error) {
        handleConnectionError(error)
        return false
      }
    },
    [connectionStatus, savedDevice, connectToGatt, handleConnectionError]
  )

  return {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported, // Export this flag
    disconnectionReason,
  }
}

export default useBluetoothHRM
