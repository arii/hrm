/**
 * @file useBluetoothHRM.ts
 * @description This custom React hook provides a streamlined interface for interacting
 * with the `DeviceManagerService` to manage Bluetooth Low Energy (BLE) Heart Rate
 * Monitor (HRM) devices. It handles state management for the UI layer and bridges
 * React's component lifecycle with the underlying Bluetooth service.
 */
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import {
  HrmInputData,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import DeviceManagerService, {
  DeviceManagerOptions,
  DeviceConnectionStatus,
  DisconnectionReason,
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
 * @function getPreviouslyConnectedDevice
 * @description Asynchronously retrieves a list of Bluetooth devices the browser has
 * permissions for and finds the one that matches the provided device ID.
 * @param {string} deviceId - The unique ID of the Bluetooth device to find.
 * @returns {Promise<BluetoothDevice | null>} The found device or null.
 */
const getPreviouslyConnectedDevice = async (
  deviceId: string
): Promise<BluetoothDevice | null> => {
  if (!isBluetoothSupported || !navigator.bluetooth.getDevices) return null
  try {
    const permittedDevices = await navigator.bluetooth.getDevices()
    return permittedDevices.find((d) => d.id === deviceId) || null
  } catch (error) {
    logger.error(
      { error },
      'Failed to retrieve list of permitted Bluetooth devices.'
    )
    return null
  }
}

/**
 * @interface BluetoothDeviceWithForget
 * @description Interface extending BluetoothDevice to include the experimental forget method.
 */
interface BluetoothDeviceWithForget extends BluetoothDevice {
  forget(): Promise<void>
}

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
}
/**
 * @hook useBluetoothHRM
 * @description Manages Bluetooth HRM device interactions by leveraging the `DeviceManagerService`.
 * It exposes state and functions for connection, disconnection, and data handling to UI components.
 *
 * @param {UseBluetoothHRMProps} props - Configuration for the hook and underlying service.
 * @returns {object} An object containing the state and methods for interacting with the HRM device.
 * @property {Function} connect - Initiates a new device scan and connection.
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
  const { sendData, connectionStatus: wsStatus } = useWebSocket()
  const wsStatusRef = useRef(wsStatus)
  useEffect(() => {
    wsStatusRef.current = wsStatus
  }, [wsStatus])

  const [lastDeviceId, setLastDeviceId] = useLocalStorage<string | null>(
    'hrm_device_id',
    null
  )

  // Memoize the service instance to ensure it persists across re-renders
  const deviceManager = useMemo(() => {
    const options: DeviceManagerOptions = {}
    if (dataLivenessTimeoutMs !== undefined)
      options.dataLivenessTimeoutMs = dataLivenessTimeoutMs
    if (reconnectIntervalMs !== undefined)
      options.reconnectIntervalMs = reconnectIntervalMs
    return new DeviceManagerService(options)
  }, [dataLivenessTimeoutMs, reconnectIntervalMs])

  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason | null>(null)

  // Effect to subscribe to device manager events and update React state
  useEffect(() => {
    const handleStatusChange = (e: CustomEvent) => {
      const { status, message } = e.detail as {
        status: DeviceConnectionStatus
        message: string
      }
      setDeviceStatus(message)
      if (status === 'error') {
        logger.error(`Bluetooth Error: ${message}`)
      }
    }

    const handleHeartRate = (e: CustomEvent) => {
      const { heartRate } = e.detail as { heartRate: number }
      const metadata: HrmMetadataUpdateMessage = {
        type: 'HRM_METADATA_UPDATE',
        data: {
          maxHr: calculateMaxHr(userAge),
          name:
            userName ||
            `Bluetooth HRM (${deviceManager.device?.name || 'Unknown'})`,
          ...(userAge && { age: userAge }),
        } as HrmMetadataUpdateData,
      }
      sendData(metadata)

      const data: HrmInputData = { value: heartRate }
      sendData({ type: 'HRM_INPUT', data })
    }

    const handleBattery = (e: CustomEvent) =>
      setBatteryLevel((e.detail as { batteryLevel: number }).batteryLevel)
    const handleDeviceConnected = (e: CustomEvent) => {
      const { device } = e.detail as { device: BluetoothDevice }
      setLastDeviceId(device.id)
      setDisconnectionReason(null)
    }

    const handleDeviceDisconnected = (e: CustomEvent) => {
      const { reason } = e.detail as { reason: DisconnectionReason }
      setBatteryLevel(null)
      if (reason !== 'manual') {
        setDisconnectionReason(reason)
      }
    }

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
  }, [deviceManager, sendData, setLastDeviceId, userAge, userName])

  // --- Public API ---
  const connect = useCallback(async () => {
    if (wsStatus !== 'Connected') {
      const msg = 'WebSocket not connected. Cannot stream HRM data.'
      setDeviceStatus(`Failed: ${msg}`)
      logger.error(msg)
      return
    }

    // Try to reconnect to last known device first
    if (lastDeviceId) {
      try {
        const device = await getPreviouslyConnectedDevice(lastDeviceId)
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
    disconnect()
    setLastDeviceId(null) // Clear from local storage
    if (
      isBluetoothSupported &&
      deviceManager.device &&
      'forget' in deviceManager.device
    ) {
      try {
        await (deviceManager.device as BluetoothDeviceWithForget).forget()
        setDeviceStatus('Device permissions revoked.')
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.error(error as any, 'Error revoking device permissions.')
        setDeviceStatus('Error forgetting device.')
      }
    }
  }, [disconnect, deviceManager, setLastDeviceId])

  const autoConnect = useCallback(async () => {
    if (wsStatusRef.current !== 'Connected' || !lastDeviceId) return

    setDeviceStatus('Reconnecting to last device...')
    try {
      const device = await getPreviouslyConnectedDevice(lastDeviceId)
      if (device) {
        if (wsStatusRef.current !== 'Connected') {
          throw new Error('WebSocket disconnected during auto-connect.')
        }
        try {
          await deviceManager.connectToDevice(device)
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          logger.error(error as any, 'Auto-connect failed.')
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          setDeviceStatus(
            `Auto-connect failed: ${errorMessage}. Please connect manually.`
          )
          setLastDeviceId(null) // Clear invalid device ID
        }
      } else {
        setDeviceStatus('Last device not found. Please connect manually.')
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.error(error as any, 'Error during auto-connect.')
      setDeviceStatus('Error checking previous devices.')
    }
  }, [wsStatusRef, lastDeviceId, deviceManager, setLastDeviceId])

  // Attempt auto-connect when WebSocket connects
  useEffect(() => {
    if (wsStatus === 'Connected') {
      void autoConnect()
    }
  }, [wsStatus, autoConnect])

  return {
    connect,
    disconnect,
    forgetDevice,
    autoConnect,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported: isBluetoothSupported,
    disconnectionReason,
  }
}

export default useBluetoothHRM
