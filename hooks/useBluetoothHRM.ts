/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss.
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'

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
 * @interface UseBluetoothHRMProps
 * @description Props for configuring the useBluetoothHRM hook.
 */
interface UseBluetoothHRMProps {
  /**
   * @property {number} [staleThresholdMs=4000]
   * @description The duration in milliseconds after which the connection is considered stale if no new data is received.
   * @default 4000
   */
  staleThresholdMs?: number
  /**
   * @property {number} [checkIntervalMs=1000]
   * @description The interval in milliseconds at which the hook checks for stale data.
   * @default 1000
   */
  checkIntervalMs?: number
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
  const { staleThresholdMs = 4000, checkIntervalMs = 1000 } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const lastUpdateRef = useRef<number>(0)
  const activeConfigRef = useRef<{ name: string; age?: number } | null>(null)
  const statusRef = useRef(deviceStatus)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
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

  // Watchdog: Monitors Liveness
  useEffect(() => {
    const isLive = deviceStatus.startsWith('Connected to:')
    if (!activeConfigRef.current || !isLive) return

    const intervalId = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current

      if (timeSinceLastUpdate > staleThresholdMs) {
        logger.warn(
          '[Bluetooth HRM] Stale connection detected. Sending death packet.'
        )
        setDeviceStatus('Connected (No Data)') // Visual feedback for local user

        const config = activeConfigRef.current
        if (config) {
          sendData({
            type: 'HRM_INPUT',
            data: {
              value: 0, // 0 tells HrmTiles to remove this user
              maxHr: config.age ? 220 - config.age : MAX_HR_DEFAULT,
              name: config.name,
              age: config.age,
            },
          })
        }
      }
    }, checkIntervalMs)

    return () => clearInterval(intervalId)
  }, [deviceStatus, sendData, staleThresholdMs, checkIntervalMs])

  /**
   * @function disconnect
   * @description Manually disconnects the device, preventing auto-reconnection.
   * @sideeffect Clears connection timeouts and resets device state.
   */
  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    setDisconnectionReason('manual')
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect()

    setDeviceStatus('Disconnected')
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

        abortControllerRef.current = new AbortController()
        const server = await cancellablePromise(device.gatt!.connect(), {
          timeoutMs: 10000,
          errorMessage: 'GATT connection timeout',
          signal: abortControllerRef.current.signal,
        })

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
        lastUpdateRef.current = Date.now()

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event: unknown) => {
            const e = event as Event
            const target = e.target as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)
            lastUpdateRef.current = Date.now()

            // Update Watchdog Timers
            if (statusRef.current !== `Connected to: ${device.name}`) {
              setDeviceStatus(`Connected to: ${device.name}`)
            }

            // Stream Data
            const config = activeConfigRef.current!
            const calculatedMaxHr = config.age
              ? 220 - config.age
              : MAX_HR_DEFAULT

            const message: HrmInputMessage = {
              type: 'HRM_INPUT',
              data: {
                value: heartRate,
                maxHr: calculatedMaxHr,
                name: config.name,
                age: config.age,
              },
            }
            sendData(message)
          }
        )

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setDeviceStatus(`Connected to: ${device.name}`)
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
    async (userName?: string, userAge?: number): Promise<void> => {
      if (deviceStatus.startsWith('Connected to:')) return
      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Attempt to reconnect to a known device first
      if (navigator.bluetooth?.getDevices) {
        setDeviceStatus('Searching for known devices...')
        try {
          const devices = await navigator.bluetooth.getDevices()
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId) {
            const knownDevice = devices.find((d) => d.id === savedDeviceId)
            if (knownDevice) {
              setDeviceStatus(`Found known device: ${knownDevice.name}`)
              const finalName =
                userName || `Bluetooth HRM (${knownDevice.name || 'Unknown'})`
              activeConfigRef.current = {
                name: finalName,
                age: userAge ? userAge : undefined,
              }
              await connectToGatt(knownDevice)
              return // Exit if successful
            }
          }
        } catch (err) {
          logger.warn(
            { error: err },
            'Error during auto-reconnect attempt. Will proceed to scan.'
          )
        }
      }

      // If no known device, or reconnect fails, prompt user with scanner
      try {
        setDeviceStatus('Scanning for devices...')
        const deviceToConnect = await navigator.bluetooth.requestDevice({
          filters: [{ services: [HR_SERVICE_UUID] }],
          optionalServices: [BATTERY_SERVICE_UUID],
        })

        if (deviceToConnect) {
          const finalName =
            userName || `Bluetooth HRM (${deviceToConnect.name || 'Unknown'})`
          activeConfigRef.current = {
            name: finalName,
            age: userAge ? userAge : undefined,
          }
          await connectToGatt(deviceToConnect)
        }
      } catch (error) {
        handleConnectionError(error)
      }
    },
    [deviceStatus, connectionStatus, connectToGatt, handleConnectionError]
  )

  return {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected to:'),
    isSupported,
    disconnectionReason,
  }
}

export default useBluetoothHRM
