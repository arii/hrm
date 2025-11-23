// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import { useUserSettings } from '@/contexts/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'

// Heart Rate Service UUIDs (Standard Bluetooth Low Energy)
const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'

/**
 * Parses the raw DataView received from the HR Measurement characteristic.
 */
const parseHeartRate = (value: DataView): number => {
  // Byte 0 is flags. Bit 0 indicates if the HR measurement is in 8 or 16 bits.
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  let heartRate = 0

  if (is16Bit) {
    // Heart rate is in 16-bit format (bytes 1 and 2)
    heartRate = value.getUint16(1, true)
  } else {
    // Heart rate is in 8-bit format (byte 1)
    heartRate = value.getUint8(1)
  }
  return heartRate
}

const useBluetoothHRM = () => {
  const { sendData, connectionStatus } = useWebSocket()
  const { userSettings, updateUserSettings } = useUserSettings()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [device, setDevice] = useState<BluetoothDevice | null>(null)

  // Use a ref to track the current status to break the dependency cycle
  const statusRef = useRef(deviceStatus)
  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

  const connectAndStream = useCallback(
    async (userName?: string, userAge?: string): Promise<boolean> => {
      if (statusRef.current.startsWith('Connected')) return true

      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return false
      }

      try {
        setDeviceStatus('Connecting...')

        let connectedDevice = device
        if (!connectedDevice && userSettings.deviceId) {
          try {
            const devices = await navigator.bluetooth.getDevices()
            connectedDevice =
              devices.find((d) => d.id === userSettings.deviceId) || null
          } catch (_error) {
            console.warn('Could not retrieve previously connected devices.')
          }
        }

        if (!connectedDevice) {
          connectedDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
          })
          if (connectedDevice) {
            updateUserSettings({ deviceId: connectedDevice.id })
          }
        }

        if (!connectedDevice) {
          setDeviceStatus('Failed: No device selected or found.')
          return false
        }
        setDevice(connectedDevice)

        setDeviceStatus(`Connecting to: ${connectedDevice.name}...`)

        // 2. Connect to GATT server
        const server = await connectedDevice.gatt!.connect()
        const service = await server.getPrimaryService(HR_SERVICE_UUID)

        // 3. Get the Heart Rate Measurement characteristic
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        // 4. Start notifications to receive real-time data
        await characteristic.startNotifications()

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event) => {
            const target =
              event.target as unknown as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)

            // --- 5. STREAM TYPED DATA TO SERVER VIA WEBSOCKET ---
            const calculatedMaxHr = userAge
              ? 220 - parseInt(userAge)
              : MAX_HR_DEFAULT
            const message: HrmInputMessage = {
              type: 'HRM_INPUT',
              data: {
                value: heartRate,
                maxHr: calculatedMaxHr,
                name:
                  userName || `Bluetooth HRM (${device?.name || 'Unknown'})`,
                age: userAge ? parseInt(userAge) : undefined,
              },
            }
            sendData(message)
          }
        )

        // Handle disconnection gracefully
        connectedDevice.addEventListener('gattserverdisconnected', () => {
          setDeviceStatus('Disconnected (Server Lost)')
          setDevice(null)
          updateUserSettings({ deviceId: null })
        })

        setDeviceStatus(`Connected to: ${connectedDevice.name}`)
        return true
      } catch (error: unknown) {
        console.error('Bluetooth connection failed:', error)
        let userFriendlyMessage =
          'An unknown error occurred during Bluetooth connection.'

        if (error instanceof DOMException) {
          switch (error.name) {
            case 'NotFoundError':
              userFriendlyMessage =
                'No Bluetooth device found. Ensure your device is powered on and nearby.'
              break
            case 'SecurityError':
              userFriendlyMessage =
                'Bluetooth permission denied. Please allow Bluetooth access in your browser.'
              break
            case 'NetworkError':
              userFriendlyMessage =
                'Bluetooth connection lost. Ensure your device is nearby and powered on.'
              break
            case 'NotSupportedError':
              userFriendlyMessage =
                'Web Bluetooth is not supported on this browser or device.'
              break
            case 'AbortError':
              // This can happen if the user cancels the device picker. It's not a "failure" in the same way.
              userFriendlyMessage = 'Device selection cancelled.'
              break
            default:
              userFriendlyMessage = `Bluetooth error: ${error.name}.`
          }
        } else if (error instanceof Error) {
          userFriendlyMessage = `Error: ${error.message}.`
        }

        setDeviceStatus(`Failed: ${userFriendlyMessage}`)
        setDevice(null)
        updateUserSettings({ deviceId: null })
        return false
      }
    },
    [
      connectionStatus,
      sendData,
      device,
      userSettings.deviceId,
      updateUserSettings,
    ]
  )

  const disconnect = useCallback(() => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect()
    }
    setDevice(null)
    setDeviceStatus('Disconnected')
    updateUserSettings({ deviceId: null })
  }, [device, updateUserSettings])

  return {
    connectAndStream,
    disconnect,
    deviceStatus,
    MAX_HR: MAX_HR_DEFAULT,
    isConnected: deviceStatus.startsWith('Connected'),
  }
}

export default useBluetoothHRM
