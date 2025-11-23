// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmInputMessage } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import { useWebSocket } from '@/context/WebSocketContext'
<<<<<<< HEAD

// Define a more structured state for the hook
export type BluetoothHRMStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'WAITING_FOR_HR'
  | 'ERROR'
  | 'RECONNECTING'

export interface BluetoothHRMState {
  status: BluetoothHRMStatus
  message: string
  deviceName?: string
}
=======
>>>>>>> origin/leader

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
  const [device, setDevice] = useState<BluetoothDevice | null>(null)

  const abortConnection = useCallback(async () => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect()
    }
    setDevice(null)
    setHrmState({ status: 'DISCONNECTED', message: 'Connection cancelled.' })
  }, [device])

  // Use a ref to track the current status to break the dependency cycle
  const statusRef = useRef(deviceStatus)
  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

  const connectAndStream = useCallback(
    async (userName?: string, userAge?: string): Promise<boolean> => {
<<<<<<< HEAD
      if (
        hrmState.status === 'CONNECTED' ||
        hrmState.status === 'CONNECTING' ||
        hrmState.status === 'WAITING_FOR_HR'
      ) {
        return true
      }
=======
      if (statusRef.current.startsWith('Connected')) return true
>>>>>>> origin/leader

      if (connectionStatus !== 'Connected') {
        setHrmState({
          status: 'DISCONNECTED',
          message: 'Waiting for WebSocket...',
        })
        return false
      }

      try {
        let currentDevice = device

        // 1. Auto-reconnect if a device ID is saved in cookies
        const savedDeviceId = getCookie('hrm_device_id')
        if (
          !currentDevice &&
          savedDeviceId &&
          typeof navigator.bluetooth.getDevices === 'function'
        ) {
          setHrmState({ status: 'RECONNECTING', message: 'Finding device...' })
          const devices = await navigator.bluetooth.getDevices()
          currentDevice = devices.find((d) => d.id === savedDeviceId) || null
        }

        // 2. If no device, prompt the user to select one
        if (!currentDevice) {
          setHrmState({ status: 'CONNECTING', message: 'Requesting device...' })
          currentDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
          })
          setCookie('hrm_device_id', currentDevice.id)
        }

        if (!currentDevice) {
          setHrmState({
            status: 'ERROR',
            message: 'No device selected or found.',
          })
          return false
        }
        setDevice(currentDevice)

        setHrmState({
          status: 'CONNECTING',
          message: `Connecting to ${currentDevice.name}...`,
          deviceName: currentDevice.name,
        })

        // 3. Connect to GATT and get characteristic
        const server = await currentDevice.gatt!.connect()
        const service = await server.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        // Set a timeout for receiving the first heart rate data
        const hrTimeout = setTimeout(() => {
          setHrmState({
            status: 'WAITING_FOR_HR',
            message: 'Connected. Waiting for first heart rate signal...',
            deviceName: currentDevice?.name,
          })
        }, 2000) // 2-second delay before showing "waiting" message

        // 4. Add listener for heart rate data
        const handleCharacteristicValueChanged = (event: Event) => {
          clearTimeout(hrTimeout) // HR data received, cancel timeout
          const target =
            event.target as unknown as BluetoothRemoteGATTCharacteristic
          const heartRate = parseHeartRate(target.value!)

          // Once we get the first value, we are fully connected
          if (hrmState.status !== 'CONNECTED') {
            setHrmState({
              status: 'CONNECTED',
              message: `Streaming data from ${currentDevice?.name}`,
              deviceName: currentDevice?.name,
            })
          }

          const calculatedMaxHr = userAge
            ? 220 - parseInt(userAge)
            : MAX_HR_DEFAULT
          const message: HrmInputMessage = {
            type: 'HRM_INPUT',
            data: {
              value: heartRate,
              maxHr: calculatedMaxHr,
              name:
                userName ||
                `Bluetooth HRM (${currentDevice?.name || 'Unknown'})`,
              age: userAge ? parseInt(userAge) : undefined,
            },
          }
          sendData(message)
        }

        characteristic.addEventListener(
          'characteristicvaluechanged',
          handleCharacteristicValueChanged
        )

        // 5. Start notifications
        await characteristic.startNotifications()

        // Handle disconnection
        currentDevice.addEventListener('gattserverdisconnected', () => {
          characteristic.removeEventListener(
            'characteristicvaluechanged',
            handleCharacteristicValueChanged
          )
          clearTimeout(hrTimeout)
          setDevice(null)
          setHrmState({
            status: 'DISCONNECTED',
            message: 'Device disconnected',
          })
        })

        return true
      } catch (error: unknown) {
        console.error('Bluetooth connection failed:', error)
        let userFriendlyMessage = 'An unknown error occurred.'

        if (error instanceof DOMException && error.name === 'AbortError') {
          userFriendlyMessage = 'Device selection cancelled.'
        } else if (error instanceof Error) {
          userFriendlyMessage = `Error: ${error.message}`
        }

        setDevice(null)
        setHrmState({ status: 'ERROR', message: userFriendlyMessage })
        return false
      }
    },
<<<<<<< HEAD
    [connectionStatus, sendData, hrmState.status, device]
=======
    [connectionStatus, sendData, savedDevice]
>>>>>>> origin/leader
  )

  return {
    connectAndStream,
    abortConnection,
    hrmState,
    setHrmState,
    MAX_HR: MAX_HR_DEFAULT,
  }
}

export default useBluetoothHRM
