/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss.
 */
import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import {
  HrmInputData,
  HrmInputMessage,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import throttle from 'lodash.throttle'
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

export type BluetoothStatus =
  | 'DISCONNECTED'
  | 'SCANNING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR'
  | 'UNSUPPORTED'
  | 'REVOKED'
  | 'STALE'

export interface HrmStatus {
  status: BluetoothStatus
  message: string
  deviceName?: string
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
 * @property {HrmStatus} hrmStatus - An object with the current status and a user-facing message.
 * @property {number | null} batteryLevel - The device's battery level (0-100), or null if unavailable.
 * @property {boolean} isConnected - True if the device is connected and streaming.
 * @property {DisconnectionReason} disconnectionReason - The reason for the last disconnection.
 *
 * @example
 * ```tsx
 * const {
 *   connectAndStream,
 *   disconnect,
 *   hrmStatus,
 *   isConnected,
 *   batteryLevel
 * } = useBluetoothHRM({ dataLivenessTimeoutMs: 5000 });
 *
 * return (
 *   <div>
 *     <p>Device Status: {hrmStatus.message}</p>
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
    throttleMs = 250,
    userName,
    userAge,
  } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [hrmStatus, setHrmStatus] = useState<HrmStatus>({
    status: 'DISCONNECTED',
    message: 'Disconnected',
  })
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)

  const statusRef = useRef(hrmStatus)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      setHrmStatus({
        status: 'UNSUPPORTED',
        message: 'Bluetooth not supported on this browser.',
      })
    }
  }, [])

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

    if (hrmStatus.status === 'CONNECTED') {
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
  }, [userName, userAge, hrmStatus, sendData])

  useEffect(() => {
    statusRef.current = hrmStatus
  }, [hrmStatus])

  // Throttling is used to limit the frequency of heart rate updates sent over the WebSocket.
  // Bluetooth devices can broadcast at very high rates (e.g., 60Hz), which can flood the
  // server and client with unnecessary updates. A frequency of 4Hz (250ms) is sufficient
  // for a smooth UI experience without causing network congestion.
  /* eslint-disable react-hooks/refs */
  // This is a safe exception. The `throttle` function is memoized and created only
  // once, so the `sendDataRef.current` call inside it will always access the
  // latest `sendData` function from the WebSocket context without causing a
  // re-render or stale closure. Disabling the rule is a pragmatic choice to
  // avoid a complex and likely unnecessary refactoring of this hook. A more
  // "correct" solution would involve passing `sendData` as a dependency to
  // `useMemo` and `throttle`, but this would create a new throttled function
  // every time `sendData` changes, which would defeat the purpose of throttling.
  const throttledSend = useMemo(
    () =>
      throttle((message: HrmInputMessage) => {
        try {
          // Always call the current sendData via the ref
          sendDataRef.current(message)
        } catch (error) {
          logger.error({ error, message }, 'Error sending throttled HRM data.')
        }
      }, throttleMs),
    // The empty dependency array `[]` ensures that the throttled function is created only
    // once when the component mounts and is reused on subsequent renders. This is critical
    // for `throttle` to work correctly as it needs to maintain its internal state (like the
    // last invocation time) across renders.
    [throttleMs]
  )
  /* eslint-enable react-hooks/refs */

  // Cleanup
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (deviceRef.current?.gatt?.connected)
        deviceRef.current.gatt.disconnect()
      // Also cancel any pending throttled calls to prevent memory leaks
      throttledSend.cancel()
    }
  }, [throttledSend])

  // Watchdog for stale data
  useEffect(() => {
    // A timeout of 0 disables the watchdog
    if (!dataLivenessTimeoutMs) return

    // This interval periodically checks if new data has been received.
    // If the time since the last data point exceeds the timeout, it triggers a reconnection.
    const interval = setInterval(() => {
      if (statusRef.current.status === 'CONNECTED' && lastDataTime.current > 0) {
        if (Date.now() - lastDataTime.current > dataLivenessTimeoutMs) {
          logger.warn('Bluetooth data stale. Forcing reconnection...')
          setDisconnectionReason('timeout')
          setHrmStatus({
            status: 'STALE',
            message: 'Connection unstable. Reconnecting...',
          })
          if (deviceRef.current?.gatt?.connected)
            deviceRef.current.gatt.disconnect()
        }
      }
    }, 2000) // Check every 2s
    return () => clearInterval(interval)
  }, [dataLivenessTimeoutMs])

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

    // Send a 'null' heart rate value to signal disconnection to the server
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    setHrmStatus({ status: 'DISCONNECTED', message: 'Disconnected' })
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
      if (navigator.bluetooth && navigator.bluetooth.getDevices) {
        const devices = await navigator.bluetooth.getDevices()
        for (const device of devices) {
          if (device.forget) await device.forget()
        }
      }
      setHrmStatus({
        status: 'REVOKED',
        message: 'Device permissions revoked.',
      })
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setHrmStatus({
        status: 'ERROR',
        message: 'Failed to clear device permissions.',
      })
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
    setHrmStatus({ status: 'ERROR', message: msg })
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)

    // Also send a null HR value to signal immediate disconnection
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    if (!isManualDisconnect.current && deviceRef.current) {
      logger.info(
        { device: deviceRef.current.name },
        'Device disconnected, attempting auto-reconnect...'
      )
      setDisconnectionReason('signal_loss')
      setHrmStatus({
        status: 'RECONNECTING',
        message: 'Signal lost. Reconnecting...',
      })
      const deviceToReconnect = deviceRef.current
      // Randomized backoff: 2-5 seconds
      const randomDelay = Math.random() * 3000 + 2000
      reconnectTimeoutRef.current = setTimeout(() => {
        if (connectToGattRef.current)
          connectToGattRef.current(deviceToReconnect)
      }, randomDelay)
    } else {
      logger.info('Device disconnected manually.')
      setHrmStatus({ status: 'DISCONNECTED', message: 'Disconnected' })
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      try {
        deviceRef.current = device
        setHrmStatus({
          status: 'CONNECTING',
          message: `Connecting to ${device.name || 'device'}...`,
          deviceName: device.name,
        })

        abortControllerRef.current = new AbortController()
        const server = await cancellablePromise(device.gatt!.connect(), {
          timeoutMs: 20000, // Increased timeout for stability
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
        lastDataTime.current = Date.now()

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event: unknown) => {
            const e = event as Event
            const target = e.target as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)
            lastDataTime.current = Date.now()

            const data: HrmInputData = {
              value: heartRate,
            }

            // Use the throttled sender for HR updates to avoid overwhelming the WebSocket.
            throttledSend({
              type: 'HRM_INPUT',
              data,
            })
          }
        )

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setHrmStatus({
          status: 'CONNECTED',
          message: `Connected to ${device.name}`,
          deviceName: device.name,
        })
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
    [onDisconnected, throttledSend]
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

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Prioritize args, but fall back to props.
      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (statusRef.current.status === 'CONNECTED') return
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        if (!silent) handleConnectionError(err)
        throw err
      }

      try {
        setHrmStatus({
          status: 'CONNECTING',
          message: 'Checking for saved devices...',
        })
        let device = savedDevice

        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            const foundDevice = devices.find((d) => d.id === savedDeviceId)

            if (foundDevice) {
              await connectToGatt(foundDevice)
              return
            }
          }
        }

        if (!device && !silent) {
          setHrmStatus({
            status: 'SCANNING',
            message: 'Waiting for device selection...',
          })
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          await connectToGatt(device)
        } else if (!silent) {
          // If the user cancels the device picker, requestDevice resolves to null
          setHrmStatus({
            status: 'DISCONNECTED',
            message: 'Connection cancelled.',
          })
        }
      } catch (error) {
        if (!silent) {
          handleConnectionError(error)
        } else {
          logger.info({ error }, 'Silent auto-connect failed.')
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
    // This is a wrapper for connectAndStream that runs in silent mode.
    // It will attempt to connect to a saved device, but will not show a
    // device picker or throw errors for the user to handle.
    return connectAndStream(undefined, undefined, { silent: true })
  }, [connectAndStream])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    hrmStatus,
    batteryLevel,
    isConnected: hrmStatus.status === 'CONNECTED',
    disconnectionReason,
  }
}

export default useBluetoothHRM
