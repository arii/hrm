/**
 * @file useBluetoothHRM.ts
 * @description This custom React hook acts as a bridge between the BluetoothDeviceManager
 * service and the React UI. It subscribes to device manager events, manages UI-related
 * state, and handles WebSocket communication for heart rate data.
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmInputData,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import { calculateMaxHr } from '../utils/constants'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  BluetoothDeviceManager,
  DeviceManagerStatus,
} from '@/services/bluetoothDeviceManager'

export type DisconnectionReason =
  | 'manual'
  | 'error'
  | 'timeout'
  | 'signal_loss'
  | null

/**
 * @hook useBluetoothHRM
 * @description A hook to interface with the BluetoothDeviceManager service.
 * It provides the UI with connection status, device data, and functions to
 * control the Bluetooth device.
 *
 * @returns {object} An object containing functions and state for managing a Bluetooth HRM device.
 * @property {Function} connect - Initiates device connection.
 * @property {Function} disconnect - Manually disconnects the device.
 * @property {Function} forgetDevice - Forgets the currently saved device.
 * @property {string} deviceStatus - A human-readable string of the current connection status.
 * @property {number | null} batteryLevel - The device's battery level (0-100), or null if unavailable.
 * @property {boolean} isConnected - True if the device is connected.
 * @property {boolean} isSupported - True if the browser supports the Web Bluetooth API.
 * @property {DisconnectionReason} disconnectionReason - The reason for the last disconnection.
 */
const useBluetoothHRM = (injectedDeviceManager?: BluetoothDeviceManager) => {
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const userDetailsRef = useRef<{ name: string; age: number } | null>(null)
  const [deviceManager] = useState(
    () => injectedDeviceManager || new BluetoothDeviceManager()
  )

  useEffect(() => {
    const handleStatusChange = (
      status: DeviceManagerStatus,
      message: string
    ): void => {
      setDeviceStatus(message)
      if (status === 'disconnected' || status === 'error') {
        setBatteryLevel(null)
      }
    }

    const handleHeartRateUpdate = (heartRate: number): void => {
      const { name, age } = userDetailsRef.current || { name: '', age: 0 }
      const calculatedMaxHr = calculateMaxHr(age)

      const metadataData: HrmMetadataUpdateData = {
        maxHr: calculatedMaxHr,
        name: name || `Bluetooth HRM`,
      }
      if (typeof age === 'number') {
        metadataData.age = age
      }

      const metadata: HrmMetadataUpdateMessage = {
        type: 'HRM_METADATA_UPDATE',
        data: metadataData,
      }
      sendData(metadata)

      const data: HrmInputData = { value: heartRate }
      sendData({ type: 'HRM_INPUT', data })
    }

    const handleBatteryLevelUpdate = (level: number): void => {
      setBatteryLevel(level)
    }

    deviceManager.on('statusChange', handleStatusChange)
    deviceManager.on('heartRateUpdate', handleHeartRateUpdate)
    deviceManager.on('batteryLevelUpdate', handleBatteryLevelUpdate)

    return () => {
      deviceManager.destroy()
    }
  }, [sendData, deviceManager])

  /**
   * @function connect
   * @description Initiates a connection to a Bluetooth HRM device.
   *
   * @param {string} [userName] - The user's name for display.
   * @param {number} [userAge] - The user's age to calculate max heart rate.
   * @returns {Promise<void>} A promise that resolves on successful connection, or rejects on failure.
   * @throws {Error} If the connection fails (e.g., WebSocket disconnected, user cancellation).
   */
  const connect = useCallback(
    async (userName?: string, userAge?: number): Promise<void> => {
      userDetailsRef.current = {
        name: userName || '',
        age: userAge || 0,
      }

      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        setDeviceStatus(`Failed: ${err.message}`)
        throw err
      }
      await deviceManager.connect()
    },
    [connectionStatus, deviceManager]
  )

  /**
   * @function disconnect
   * @description Manually disconnects the device.
   */
  const disconnect = useCallback(() => {
    setDisconnectionReason('manual')
    deviceManager.disconnect()
  }, [deviceManager])

  /**
   * @function forgetDevice
   * @description Forgets the currently saved device.
   */
  const forgetDevice = useCallback(async () => {
    await deviceManager.forgetDevice()
  }, [deviceManager])

  return {
    connect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported: deviceManager.isSupported,
    disconnectionReason,
  }
}

export default useBluetoothHRM
