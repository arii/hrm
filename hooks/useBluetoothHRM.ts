// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import useWebSocket from './useWebSocket'

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

// Cookie helpers for device persistence
const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
  }
}

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '')
}

const useBluetoothHRM = () => {
  // We assume the useWebSocket hook is available and provides the sendData function
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)

  const connectAndStream = useCallback(
    async (userName?: string, userAge?: string): Promise<boolean> => {
      if (deviceStatus.startsWith('Connected')) return true

      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return false
      }

      try {
        setDeviceStatus('Connecting...') // More specific status

        // 1. Try to reconnect to saved device first, otherwise request new device
        let device = savedDevice
        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId && navigator.bluetooth.getDevices) {
            // Try to get previously paired device
            const devices = await navigator.bluetooth.getDevices()
            device = devices.find((d) => d.id === savedDeviceId) || null
          }

          if (!device) {
            // Request new device
            device = await navigator.bluetooth.requestDevice({
              filters: [{ services: [HR_SERVICE_UUID] }],
            })
            // Save device info
            setCookie('hrm_device_id', device.id)
          }
          // After getting the device, save it to the state for future use
          setSavedDevice(device)
        }

        if (!device) {
          setDeviceStatus('Failed: No device selected or found.')
          return false
        }

        setDeviceStatus(`Connecting to: ${device.name}...`)

        // 2. Connect to GATT server
        const server = await device.gatt!.connect()
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
        device.addEventListener('gattserverdisconnected', () => {
          setDeviceStatus('Disconnected (Server Lost)')
          setSavedDevice(null) // Clear saved device on disconnect
        })

        setDeviceStatus(`Connected to: ${device.name}`)
        return true // Signal success
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
        setSavedDevice(null) // Clear saved device on failure to allow re-pairing
        return false // Signal failure
      }
    },
    [connectionStatus, sendData, deviceStatus, savedDevice]
  )

  return {
    connectAndStream,
    deviceStatus,
    MAX_HR: MAX_HR_DEFAULT,
    isConnected: deviceStatus.startsWith('Connected'),
  }
}

export default useBluetoothHRM
