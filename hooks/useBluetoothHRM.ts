// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'

// Define a more structured state for the hook
export type BluetoothHRMStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'RECONNECTING'

export interface BluetoothHRMState {
  status: BluetoothHRMStatus
  message: string
  deviceName?: string
}
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
  const { sendData, connectionStatus } = useWebSocket()
  const [hrmState, setHrmState] = useState<BluetoothHRMState>({
    status: 'DISCONNECTED',
    message: 'Ready to connect',
  })
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)

  const connectAndStream = useCallback(
    async (userName?: string, userAge?: string): Promise<boolean> => {
      if (hrmState.status === 'CONNECTED' || hrmState.status === 'CONNECTING') {
        return true
      }

      if (connectionStatus !== 'Connected') {
        setHrmState({
          status: 'DISCONNECTED',
          message: 'Waiting for WebSocket...',
        })
        return false
      }

      try {

        // 1. Try to reconnect to saved device first
        let device = savedDevice
        const savedDeviceId = getCookie('hrm_device_id')

        if (
          !device &&
          savedDeviceId &&
          typeof navigator.bluetooth.getDevices === 'function'
        ) {
          setHrmState({ status: 'RECONNECTING', message: 'Finding device...' })
          const devices = await navigator.bluetooth.getDevices()
          device = devices.find((d) => d.id === savedDeviceId) || null
        }

        // 2. If no saved device, request a new one
        if (!device) {
          setHrmState({ status: 'CONNECTING', message: 'Requesting device...' })
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
          })
          setCookie('hrm_device_id', device.id)
        }

        if (!device) {
          setHrmState({
            status: 'ERROR',
            message: 'No device selected or found.',
          })
          return false
        }

        // Save for future reconnections
        setSavedDevice(device)
        setHrmState({
          status: 'CONNECTING',
          message: `Connecting to ${device.name}...`,
          deviceName: device.name,
        })

        // 3. Connect to GATT server
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
          setHrmState({
            status: 'DISCONNECTED',
            message: 'Device disconnected',
          })
          setSavedDevice(null) // Clear saved device to allow re-pairing
        })

        setHrmState({
          status: 'CONNECTED',
          message: `Streaming data from ${device.name}`,
          deviceName: device.name,
        })
        return true
      } catch (error: unknown) {
        console.error('Bluetooth connection failed:', error)
        let userFriendlyMessage = 'An unknown error occurred.'

        if (error instanceof DOMException) {
          if (error.name === 'AbortError') {
            userFriendlyMessage = 'Device selection cancelled.'
            setHrmState({ status: 'DISCONNECTED', message: userFriendlyMessage })
          } else {
            userFriendlyMessage = `Bluetooth Error: ${error.message}`
            setHrmState({ status: 'ERROR', message: userFriendlyMessage })
          }
        } else if (error instanceof Error) {
          userFriendlyMessage = error.message
          setHrmState({ status: 'ERROR', message: userFriendlyMessage })
        } else {
          setHrmState({ status: 'ERROR', message: userFriendlyMessage })
        }

        setSavedDevice(null)
        return false
      }
    },
    [connectionStatus, sendData, hrmState.status, savedDevice]
  )

  return {
    connectAndStream,
    hrmState,
    MAX_HR: MAX_HR_DEFAULT,
  }
}

export default useBluetoothHRM
