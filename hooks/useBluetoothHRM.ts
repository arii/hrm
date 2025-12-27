/**
 * @file useBluetoothHRM.ts
 * @description This custom React hook provides a streamlined interface for interacting
 * with the `DeviceManagerService` to manage Bluetooth Low Energy (BLE) Heart Rate
 * Monitor (HRM) devices. It handles state management for the UI layer and bridges
 * React's component lifecycle with the underlying Bluetooth service.
 */
import { useCallback, useState, useEffect, useRef } from 'react'
import {
  HrmInputData,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import { calculateMaxHr } from '../utils/constants'
import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import DeviceManagerService, {
  DeviceManagerOptions,
  DisconnectionReason,
  DeviceManagerEvent,
} from '@/services/DeviceManagerService'
import useLocalStorage from '@/hooks/useLocalStorage'

/**
 * @constant isBluetoothSupported
 * @description A boolean flag indicating if the Web Bluetooth API is supported by the browser.
 * This check is performed once and memoized for efficiency.
 */
const isBluetoothSupported =
  typeof navigator !== 'undefined' && !!navigator.bluetooth


/**
 * @interface UseBluetoothHRMProps
 * @description Props for the `useBluetoothHRM` hook, allowing customization of the underlying `DeviceManagerService`.
 */
interface UseBluetoothHRMProps extends DeviceManagerOptions {
  /**
   * @property {string} [userName] - The user's name, used for display purposes.
   * @property {number} [userAge] - The user's age, used for calculating max heart rate.
   */
  userName?: string
  userAge?: number
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
 * @hook useBluetoothHRM
 * @description Manages Bluetooth HRM device interactions by leveraging the `DeviceManagerService`.
 * It exposes state and functions for connection, disconnection, and data handling to UI components.
 *
 * @param {UseBluetoothHRMProps} props - Configuration for the hook and underlying service.
 * @returns {object} An object containing the state and methods for interacting with the HRM device.
 * @property {Function} connect - Initiates a new device scan and connection.
 * @deprecated `connectAndStream` has been removed. Use `connect` instead.
 * @property {Function} disconnect - Disconnects the current device.
 * @property {Function} forgetDevice - Revokes permissions for the connected device.
 * @property {Function} autoConnect - Attempts to connect to the last used device.
 * @property {string} deviceStatus - Human-readable status of the connection.
 * @property {number | null} batteryLevel - The device's battery level (0-100), or null.
 * @property {boolean} isConnected - True if the device is connected.
 * @property {boolean} isSupported - True if Web Bluetooth is supported.
 * @property {DisconnectionReason | null} disconnectionReason - The reason for the last disconnection.
 */
export const useBluetoothHRM = (props: UseBluetoothHRMProps) => {
  const { userName, userAge, dataLivenessTimeoutMs, reconnectIntervalMs } =
    props
  const { sendData, connectionStatus: wsStatus } = useWebSocket() as {
    sendData: (data: unknown) => void
    connectionStatus: string
  }
  const wsStatusRef = useRef(wsStatus)
  useEffect(() => {
    wsStatusRef.current = wsStatus
  }, [wsStatus])

  const autoConnectController = useRef<AbortController | null>(null)

  const [lastDeviceId, setLastDeviceId] = useLocalStorage<string | null>(
    'hrm_device_id',
    null
  )

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const { staleThresholdMs = 4000, checkIntervalMs = 1000 } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [isStale, setIsStale] = useState(true)
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
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

  // Initialize service instance once
  const [deviceManager] = useState(
    () =>
      new DeviceManagerService({
        dataLivenessTimeoutMs,
        reconnectIntervalMs,
        sendData: sendData,
      })
  )

  // Update service options when props change
  useEffect(() => {
    const options: Partial<DeviceManagerOptions> = {}
    if (dataLivenessTimeoutMs !== undefined)
      options.dataLivenessTimeoutMs = dataLivenessTimeoutMs
    if (reconnectIntervalMs !== undefined)
      options.reconnectIntervalMs = reconnectIntervalMs
    deviceManager.updateOptions(options)
  }, [deviceManager, dataLivenessTimeoutMs, reconnectIntervalMs])

  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason | null>(null)

  // Send metadata when device connects or user details change
  useEffect(() => {
    if (deviceStatus.startsWith('Connected') && deviceManager.device) {
      const metadata: HrmMetadataUpdateMessage = {
        type: 'HRM_METADATA_UPDATE',
        data: {
          maxHr: calculateMaxHr(userAge),
          name:
            userName ||
            `Bluetooth HRM (${deviceManager.device.name || 'Unknown'})`,
          ...(userAge && { age: userAge }),
        } as HrmMetadataUpdateData,
      }
      sendData(metadata)
    }
  }, [deviceStatus, userName, userAge, sendData, deviceManager.device])

  // Effect to subscribe to device manager events and update React state
  useEffect(() => {
    const handleStatusChange = (e: DeviceManagerEvent<'status-changed'>) => {
      const { status, message } = e.detail
      setDeviceStatus(message)
      if (status === 'error') {
        logger.error(`Bluetooth Error: ${message}`)
      }
    }

    const handleHeartRate = (e: DeviceManagerEvent<'heart-rate-received'>) => {
      const { heartRate } = e.detail
      const data: HrmInputData = { value: heartRate }
      sendData({ type: 'HRM_INPUT', data })
    }

    const handleBattery = (e: DeviceManagerEvent<'battery-level-received'>) =>
      setBatteryLevel(e.detail.batteryLevel)
    const handleDeviceConnected = (
      e: DeviceManagerEvent<'device-connected'>
    ) => {
      const { device } = e.detail
      setLastDeviceId(device.id)
      setDisconnectionReason(null)
    }

    const handleDeviceDisconnected = (
      e: DeviceManagerEvent<'device-disconnected'>
    ) => {
      const { reason } = e.detail
      setBatteryLevel(null)
      if (reason !== 'manual') {
        setDisconnectionReason(reason)
      }
    }
  // Watchdog: Monitors Liveness
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only check if we think we are connected/active
      if (!activeConfigRef.current || isStale) return

      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current

      if (timeSinceLastUpdate > staleThresholdMs) {
        logger.warn(
          '[Bluetooth HRM] Stale connection detected. Sending death packet.'
        )
        setIsStale(true)
        setDeviceStatus('Connected (No Data)') // Visual feedback for local user

        // This "death packet" is a crucial piece of synchronization.
        // By sending a value of 0, we explicitly tell the server that this
        // user's heart rate is no longer available. The backend uses this
        // signal to remove the user from any active displays, preventing
        // a "frozen" state where the last known heart rate is shown indefinitely.
        const config = activeConfigRef.current
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
    }, checkIntervalMs)

    return () => clearInterval(intervalId)
  }, [sendData, staleThresholdMs, checkIntervalMs, isStale])

    deviceManager.addEventListener('status-changed', handleStatusChange)
    deviceManager.addEventListener('heart-rate-received', handleHeartRate)
    deviceManager.addEventListener('battery-level-received', handleBattery)
    deviceManager.addEventListener('device-connected', handleDeviceConnected)
    deviceManager.addEventListener(
      'device-disconnected',
      handleDeviceDisconnected
    )

    // Cleanup: Remove listeners and disconnect on unmount
    return () => {
      deviceManager.removeEventListener('status-changed', handleStatusChange)
      deviceManager.removeEventListener('heart-rate-received', handleHeartRate)
      deviceManager.removeEventListener('battery-level-received', handleBattery)
      deviceManager.removeEventListener(
        'device-connected',
        handleDeviceConnected
      )
      deviceManager.removeEventListener(
        'device-disconnected',
        handleDeviceDisconnected
      )
      deviceManager.disconnect()
    }
  }, [deviceManager, sendData, setLastDeviceId])

  // --- Public API ---
  const connect = useCallback(async () => {
    if (autoConnectController.current) {
      autoConnectController.current.abort()
      autoConnectController.current = null
    }


    // Try to reconnect to last known device first
    if (lastDeviceId) {
      try {
        const device = await deviceManager.getPreviouslyConnectedDevice(lastDeviceId)
        if (device) {
          await deviceManager.connectToDevice(device)
          return
        }
      } catch {
        // Fallback to picker if silent reconnection fails
      }
    }

    try {
      await deviceManager.findAndConnect()
    } catch (error) {
      // Errors are primarily handled by the 'status-changed' event listener
      // to update UI state. We catch here to prevent unhandled promise rejections.
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        logger.info('User cancelled Bluetooth device selection.')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.error(error as any, 'Failed to connect to device.')
      }
    }
  }, [deviceManager, wsStatus, lastDeviceId])

  const disconnect = useCallback(() => {
    setDeviceStatus('Disconnecting...')
    try {
      deviceManager.disconnect()
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect device.')
      setDeviceStatus('Error disconnecting.')
    }
  }, [deviceManager])

  const forgetDevice = useCallback(async () => {
    logger.info('Forgetting Bluetooth device...')
    // No need to call disconnect(), service.forget() handles it
    setLastDeviceId(null) // Clear from local storage
    try {
      await deviceManager.forget()
      setDeviceStatus('Device permissions revoked.')
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.error(error as any, 'Error revoking device permissions.')
      setDeviceStatus(
        'Error forgetting device. Please ensure it is disconnected and try again.'
      )
    }
  }, [deviceManager, setLastDeviceId])

  const autoConnect = useCallback(async () => {
    if (wsStatusRef.current !== 'Connected' || !lastDeviceId) return

    if (autoConnectController.current) {
      autoConnectController.current.abort()
    }
    autoConnectController.current = new AbortController()
    const signal = autoConnectController.current.signal

    setDeviceStatus('Reconnecting to last device...')
    try {
      const device = await getPreviouslyConnectedDevice(lastDeviceId)
      if (signal.aborted) return

      if (device) {
        if (wsStatusRef.current !== 'Connected') {
          throw new Error('WebSocket disconnected during auto-connect.')
        }
        try {
          await deviceManager.connectToDevice(device)
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          logger.error(error as any, 'Auto-connect failed.')
          setDeviceStatus(
            'Auto-connect failed. Please connect manually to resume.'
          )
          setLastDeviceId(null) // Clear invalid device ID
        }
      } else {
        setDeviceStatus(
          'Auto-connect failed. Please connect manually to resume.'

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
            lastUpdateRef.current = Date.now()
            if (isStale) {
              setDeviceStatus(`Connected to: ${device.name}`)
              setIsStale(false)
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
        setLastDeviceId(null) // Clear invalid device ID
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.error(error as any, 'Error during auto-connect.')
      setDeviceStatus('Error checking previous devices.')
    }
  }, [wsStatusRef, lastDeviceId, deviceManager, setLastDeviceId])
    },
    [onDisconnected, sendData, isStale]
  )

  // Attempt auto-connect when WebSocket connects
  useEffect(() => {
    if (wsStatus === 'Connected' && lastDeviceId) {
      void autoConnect()
    }
  }, [wsStatus, lastDeviceId, autoConnect])
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
      if (deviceStatus.startsWith('Connected') && !isStale) return
      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      try {
        setDeviceStatus('Connecting...')
        let deviceToConnect = savedDevice

        if (!deviceToConnect) {
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            const foundDevice = devices.find((d) => d.id === savedDeviceId)

            if (foundDevice) {
              deviceToConnect = foundDevice
            } else {
              logger.info('Saved device not found, requesting new device.')
            }
          }
        }

        if (!deviceToConnect) {
          setDeviceStatus('Scanning for devices...')
          // Note: acceptAllDevices is an alternative if filters fail,
          // but strict filtering is better for UX to avoid showing non-HRM devices.
          deviceToConnect = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

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
    [
      deviceStatus,
      connectionStatus,
      savedDevice,
      connectToGatt,
      handleConnectionError,
      isStale,
    ]
  )

  return {
    connect,
    disconnect,
    forgetDevice,
    autoConnect,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported: isBluetoothSupported,
    isConnected: deviceStatus.startsWith('Connected') && !isStale, // Expose strict liveness
    isSupported,
    disconnectionReason,
  }
}

export default useBluetoothHRM
