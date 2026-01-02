/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss.
 */
import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { HrmInputMessage } from '../types/websocket'
import throttle from 'lodash.throttle'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'
import { getCookie, setCookie } from '@/utils/cookies'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  throttleMs?: number
  smoothedHeartRate: number
  calories: number
}

type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss' | null

/**
 * @hook useBluetoothHRM
 * @description A comprehensive hook for managing Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It handles device discovery, connection, data streaming, and automatic reconnection.
 *
 * @param {UseBluetoothHRMProps} props - Configuration options for the hook.
 * @property {number} [dataLivenessTimeoutMs=10000] - Timeout in ms for stale data before forcing a reconnect.
 * @property {number} [throttleMs=250] - Throttle interval in ms for sending HR data via WebSocket.
 * @property {number} smoothedHeartRate - The smoothed heart rate value to be sent.
 * @property {number} calories - The total accumulated calories to be sent.
 *
 * @returns {object} An object containing the state and functions to interact with the HRM device.
 * @property {Function} connectAndStream - Function to initiate connection to a device.
 * @property {Function} autoConnect - Function to silently connect to a previously saved device.
 * @property {Function} disconnect - Function to manually disconnect from the current device.
 * @property {Function} forgetDevice - Function to disconnect and revoke permissions for a device.
 * @property {string} deviceStatus - The current status of the Bluetooth connection.
 * @property {number | null} batteryLevel - The last known battery level of the connected device.
 * @property {boolean} isConnected - A boolean indicating if the device is currently connected.
 * @property {boolean} isSupported - A boolean indicating if Web Bluetooth is supported by the browser.
 * @property {DisconnectionReason} disconnectionReason - The reason for the last disconnection.
 */
const useBluetoothHRM = (props: UseBluetoothHRMProps) => {
  const {
    dataLivenessTimeoutMs = 10000,
    throttleMs = 250,
    smoothedHeartRate,
    calories,
  } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [rawHeartRate, setRawHeartRate] = useState(0)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const statusRef = useRef(deviceStatus)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)

  const sendDataRef = useRef(sendData)
  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

  /* eslint-disable react-hooks/refs */
  const throttledSend = useMemo(
    () =>
      throttle((message: HrmInputMessage) => {
        try {
          sendDataRef.current(message)
        } catch (error) {
          logger.error({ error, message }, 'Error sending throttled HRM data.')
        }
      }, throttleMs),
    [throttleMs]
  )
  /* eslint-enable react-hooks/refs */

  // Cleanup
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (deviceRef.current?.gatt?.connected)
        deviceRef.current.gatt.disconnect()
      throttledSend.cancel()
    }
  }, [throttledSend])

  // Watchdog for stale data
  useEffect(() => {
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
    }, 2000)
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
      msg = `Bluetooth error: ${error.name}`
    } else if (error instanceof Error) {
      msg = `Error: ${error.message}`
    }
    setDeviceStatus(`Failed: ${msg}`)
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    if (!isManualDisconnect.current && deviceRef.current) {
      logger.info(
        { device: deviceRef.current.name },
        'Device disconnected, attempting auto-reconnect...'
      )
      setDisconnectionReason('signal_loss')
      setDeviceStatus('Signal Lost. Retrying...')
      const deviceToReconnect = deviceRef.current
      const randomDelay = Math.random() * 3000 + 2000
      reconnectTimeoutRef.current = setTimeout(() => {
        if (connectToGattRef.current)
          connectToGattRef.current(deviceToReconnect)
      }, randomDelay)
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
          timeoutMs: 20000,
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
          batteryChar.addEventListener('characteristicvaluechanged', (e) => {
            const target = e.target as BluetoothRemoteGATTCharacteristic
            setBatteryLevel(target.value!.getUint8(0))
          })
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
            setRawHeartRate(heartRate) // Update raw HR state

            // Send the full payload with smoothed HR and calories
            throttledSend({
              type: 'HRM_INPUT',
              data: { value: smoothedHeartRate, calories },
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
    async (options: { silent?: boolean } = {}): Promise<void> => {
      const { silent = false } = options
      if (abortControllerRef.current) abortControllerRef.current.abort()

      if (statusRef.current.startsWith('Connected')) return
      if (connectionStatus !== 'Connected') {
        throw new Error('WebSocket not connected. Cannot stream data.')
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
              await connectToGatt(foundDevice)
              return
            }
          }
        }
        if (!device && !silent) {
          setDeviceStatus('Scanning for devices...')
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }
        if (device) await connectToGatt(device)
      } catch (error) {
        if (!silent) handleConnectionError(error)
        else logger.info({ error }, 'Silent auto-connect failed.')
        if (!silent) throw error
      }
    },
    [connectionStatus, savedDevice, connectToGatt, handleConnectionError]
  )

  const autoConnect = useCallback(async (): Promise<void> => {
    return connectAndStream({ silent: true })
  }, [connectAndStream])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported,
    disconnectionReason,
    rawHeartRate,
  }
}

export default useBluetoothHRM
