// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import useWebSocket from './useWebSocket'

// Service UUIDs
const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_CHARACTERISTIC_UUID = 'battery_level'

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
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)

  const connectAndStream = useCallback(
    async (userName?: string, userAge?: string) => {
      if (deviceStatus.startsWith('Connected')) return

      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return
      }

      try {
        setDeviceStatus('Connecting')

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
              optionalServices: [BATTERY_SERVICE_UUID],
            })
            // Save device info
            setCookie('hrm_device_id', device.id)
            setSavedDevice(device)
          }
        }

        setDeviceName(device.name || 'Unknown Device')
        setDeviceStatus(`Connected to: ${device.name}`)

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

            console.log(
              `[Bluetooth HRM] Heart rate received: ${heartRate} (Page focus: ${document.hasFocus()})`
            )

            // --- 5. STREAM TYPED DATA TO SERVER VIA WEBSOCKET ---
            const calculatedMaxHr = userAge
              ? 220 - parseInt(userAge)
              : MAX_HR_DEFAULT
            const message: HrmInputMessage = {
              type: 'HRM_INPUT',
              data: {
                value: heartRate,
                maxHr: calculatedMaxHr,
                name: userName || `Bluetooth HRM (${device.name || 'Unknown'})`,
                age: userAge ? parseInt(userAge) : undefined,
              },
            }
            console.log('[Bluetooth HRM] Sending message:', message)
            sendData(message)
          }
        )

        // 6. Get Battery Level (if available)
        try {
          const batteryService =
            await server.getPrimaryService(BATTERY_SERVICE_UUID)
          const batteryCharacteristic = await batteryService.getCharacteristic(
            BATTERY_CHARACTERISTIC_UUID
          )
          const batteryValue = await batteryCharacteristic.readValue()
          const batteryPercent = batteryValue.getUint8(0)
          setBatteryLevel(batteryPercent)

          // Subscribe to battery level changes
          await batteryCharacteristic.startNotifications()
          batteryCharacteristic.addEventListener(
            'characteristicvaluechanged',
            (event) => {
              const target =
                event.target as unknown as BluetoothRemoteGATTCharacteristic
              const newBatteryLevel = target.value!.getUint8(0)
              setBatteryLevel(newBatteryLevel)
              console.log(
                `[Bluetooth HRM] Battery level updated: ${newBatteryLevel}%`
              )
            }
          )
        } catch (err) {
          console.warn(
            '[Bluetooth HRM] Battery service not found or accessible:',
            err
          )
          setBatteryLevel(null) // Reset if service is not found
        }

        // Handle disconnection gracefully
        device.addEventListener('gattserverdisconnected', () => {
          setDeviceStatus('Disconnected (Server Lost)')
          setSavedDevice(null)
          setBatteryLevel(null)
          setDeviceName(null)
        })
      } catch (error: unknown) {
        console.error('Bluetooth connection failed:', error)
        let userFriendlyMessage =
          'An unknown error occurred during Bluetooth connection.'
        let suggestChromeFlags = false

        if (error instanceof DOMException) {
          switch (error.name) {
            case 'NotFoundError':
              userFriendlyMessage =
                'No Bluetooth device found. Ensure your device is powered on and nearby. If Bluetooth is disabled, visit chrome://flags to enable it.'
              suggestChromeFlags = true
              break
            case 'SecurityError':
              userFriendlyMessage =
                'Bluetooth permission denied. Enable Web Bluetooth at chrome://flags, then refresh and try again.'
              suggestChromeFlags = true
              break
            case 'NetworkError':
              userFriendlyMessage =
                'Bluetooth connection lost. Ensure your device is nearby and powered on.'
              break
            case 'NotSupportedError':
              userFriendlyMessage =
                "Web Bluetooth is not supported. Enable it at chrome://flags (search 'Web Bluetooth'), then refresh the page."
              suggestChromeFlags = true
              break
            case 'AbortError':
              userFriendlyMessage =
                'Bluetooth connection attempt was cancelled or aborted by the system.'
              break
            default:
              userFriendlyMessage = `Bluetooth error: ${error.name}. If unsupported, try enabling Web Bluetooth at chrome://flags.`
              suggestChromeFlags = true
          }
        } else if (error instanceof Error) {
          userFriendlyMessage = `Error: ${error.message}. If Web Bluetooth is not available, enable it at chrome://flags.`
          suggestChromeFlags = true
        }

        const fullMessage = suggestChromeFlags
          ? `${userFriendlyMessage} [Visit chrome://flags to enable Web Bluetooth]`
          : userFriendlyMessage

        setDeviceStatus(`Failed: ${fullMessage}`)
      }
    },
    [deviceStatus, connectionStatus, sendData, savedDevice]
  )

  return {
    connectAndStream,
    deviceStatus,
    deviceName,
    batteryLevel,
    MAX_HR: MAX_HR_DEFAULT,
    isConnected: deviceStatus.startsWith('Connected'),
  }
}

export default useBluetoothHRM
