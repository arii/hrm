// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmInputMessage, HrmInputData } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import { useWebSocket } from '@/context/WebSocketContext'

export type HRMStatus =
  | 'DISCONNECTED'
  | 'SEARCHING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'

export interface HRMState {
  status: HRMStatus
  deviceName?: string
  errorMessage?: string
}

// Heart Rate Service UUIDs (Standard Bluetooth Low Energy)
const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

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
    return parts[0] === name && parts[1] ? decodeURIComponent(parts[1]) : r
  }, '')
}

const useBluetoothHRM = () => {
  // We assume the useWebSocket hook is available and provides the sendData function
  const { sendData, connectionStatus } = useWebSocket()
  const [hrmState, setHrmState] = useState<HRMState>({
    status: 'DISCONNECTED',
  })
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)

  // Refs to track state without dependency cycles or for event handlers
  const statusRef = useRef(hrmState.status)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const userDetailsRef = useRef<{ name: string; age: string } | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Ref to hold the connectToGatt function to break dependency cycles
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)

  useEffect(() => {
    statusRef.current = hrmState.status
  }, [hrmState.status])

  // Cleanup on unmount
  useEffect(() => {
    const timeoutHandle = reconnectTimeoutRef.current
    return () => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      if (deviceRef.current && deviceRef.current.gatt?.connected) {
        deviceRef.current.gatt.disconnect()
      }
    }
  }, []) // Empty dependency array means this runs on unmount

  // Watchdog for stale data
  useEffect(() => {
    const interval = setInterval(() => {
      if (statusRef.current === 'CONNECTED' && lastDataTime.current > 0) {
        const timeSinceLastData = Date.now() - lastDataTime.current
        // If no data for > 10 seconds, consider it stale/lost
        if (timeSinceLastData > 10000) {
          console.warn('Bluetooth data stale. Forcing reconnection...')
          setHrmState({
            status: 'CONNECTING',
            deviceName: deviceRef.current?.name,
            errorMessage: 'Connection unstable. Reconnecting...',
          })
          // Force disconnect to trigger the ondisconnect handler which handles reconnection
          if (deviceRef.current?.gatt?.connected) {
            deviceRef.current.gatt.disconnect()
          }
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)

    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }

    setHrmState({ status: 'DISCONNECTED' })
    setSavedDevice(null)
    setBatteryLevel(null)
    deviceRef.current = null
    setCookie('hrm_device_id', '', -1)
  }, [])

  const handleConnectionError = useCallback((error: unknown) => {
    let errorMessage = 'An unknown error occurred during Bluetooth connection.'
    if (error instanceof DOMException) {
      errorMessage = `Bluetooth error: ${error.name}`
      if (error.name === 'NotFoundError')
        errorMessage = 'No device found/selected.'
    } else if (error instanceof Error) {
      errorMessage = `Error: ${error.message}`
    }
    setHrmState({ status: 'ERROR', errorMessage })
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)

    if (!isManualDisconnect.current && deviceRef.current) {
      console.log('Attempting auto-reconnect...')
      setHrmState({
        status: 'CONNECTING',
        deviceName: deviceRef.current?.name,
        errorMessage: 'Signal Lost. Retrying...',
      })

      const deviceToReconnect = deviceRef.current
      reconnectTimeoutRef.current = setTimeout(() => {
        if (connectToGattRef.current) {
          connectToGattRef.current(deviceToReconnect)
        }
      }, 2000)
    } else {
      setHrmState({ status: 'DISCONNECTED' })
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      try {
        deviceRef.current = device
        setHrmState({ status: 'CONNECTING', deviceName: device.name })

        const server = await device.gatt!.connect()

        // 1. Heart Rate Service
        const service = await server.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        // 2. Battery Service (Optional)
        try {
          const batteryService =
            await server.getPrimaryService(BATTERY_SERVICE_UUID)
          const batteryChar = await batteryService.getCharacteristic(
            BATTERY_LEVEL_CHARACTERISTIC_UUID
          )
          const value = await batteryChar.readValue()
          setBatteryLevel(value.getUint8(0))

          // Optional: Subscribe to battery changes
          await batteryChar.startNotifications()
          batteryChar.addEventListener('characteristicvaluechanged', (e) => {
            const target =
              e.target as unknown as BluetoothRemoteGATTCharacteristic
            setBatteryLevel(target.value!.getUint8(0))
          })
        } catch (err) {
          console.warn('Battery service not available:', err)
        }

        // 3. Start HR notifications
        await characteristic.startNotifications()
        lastDataTime.current = Date.now() // Initialize timestamp

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event) => {
            const target =
              event.target as unknown as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)
            lastDataTime.current = Date.now()

            // Stream data
            const { name, age } = userDetailsRef.current || {}
            const calculatedMaxHr = age ? 220 - parseInt(age) : MAX_HR_DEFAULT

            const data: HrmInputData = {
              value: heartRate,
              maxHr: calculatedMaxHr,
              name: name || `Bluetooth HRM (${device?.name || 'Unknown'})`,
            }
            if (age) {
              data.age = parseInt(age)
            }
            const message: HrmInputMessage = {
              type: 'HRM_INPUT',
              data,
            }
            sendData(message)
          }
        )

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setHrmState({ status: 'CONNECTED', deviceName: device.name })
        setSavedDevice(device)
        isManualDisconnect.current = false // Reset manual flag
        return true
      } catch (error: unknown) {
        console.error('GATT Connection failed:', error)
        handleConnectionError(error)
        return false
      }
    },
    [handleConnectionError, onDisconnected, sendData]
  )

  // Update the ref whenever connectToGatt changes
  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  const connectAndStream = useCallback(
    async (userName?: string, userAge?: string): Promise<boolean> => {
      // Update user details for streaming
      userDetailsRef.current = {
        name: userName || '',
        age: userAge || '',
      }

      if (statusRef.current === 'CONNECTED') return true

      if (connectionStatus !== 'Connected') {
        setHrmState({
          status: 'ERROR',
          errorMessage: 'WebSocket not connected.',
        })
        return false
      }

      try {
        setHrmState({ status: 'SEARCHING' })
        let device = savedDevice

        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
          // Try to retrieve known devices if supported
          if (
            savedDeviceId &&
            navigator.bluetooth &&
            navigator.bluetooth.getDevices
          ) {
            const devices = await navigator.bluetooth.getDevices()
            device = devices.find((d) => d.id === savedDeviceId) || null
          }

          if (!device) {
            // Request new device
            // Must include battery_service in optionalServices to access it later
            device = await navigator.bluetooth.requestDevice({
              filters: [{ services: [HR_SERVICE_UUID] }],
              optionalServices: [BATTERY_SERVICE_UUID],
            })
            setCookie('hrm_device_id', device.id)
          }
        }

        if (!device) {
          setHrmState({ status: 'DISCONNECTED' })
          return false
        }

        return await connectToGatt(device)
      } catch (error) {
        handleConnectionError(error)
        return false
      }
    },
    [connectionStatus, savedDevice, connectToGatt, handleConnectionError] // Dependencies
  )

  return {
    connectAndStream,
    disconnect,
    hrmState,
    batteryLevel,
    MAX_HR: MAX_HR_DEFAULT,
  }
}

export default useBluetoothHRM
