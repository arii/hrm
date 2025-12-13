
import { useCallback, useState, useRef, useEffect } from 'react'
import { HrmInputData } from '../types/websocket'
import { MAX_HR_DEFAULT } from '../utils/constants'
import { useWebSocket } from '@/context/WebSocketContext'
import useAutoConnect from './useAutoConnect'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/`
  }
}

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name && parts[1] ? decodeURIComponent(parts[1]) : r
  }, '')
}

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  msg: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(msg)), ms)
    promise.then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

const useBluetoothHRM = () => {
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [shouldReconnect, setShouldReconnect] = useState(false)

  const statusRef = useRef(deviceStatus)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const userDetailsRef = useRef<{ name: string; age: string } | null>(null)

  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && !!navigator.bluetooth)
  }, [])

  useEffect(() => {
    return () => {
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect()
      }
    }
  }, [])

  // Watchdog for stale data
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        statusRef.current.startsWith('Connected') &&
        lastDataTime.current > 0 &&
        !shouldReconnect
      ) {
        if (Date.now() - lastDataTime.current > 10000) {
          console.warn('Bluetooth data stale. Forcing reconnection...')
          if (deviceRef.current?.gatt?.connected) {
            deviceRef.current.gatt.disconnect()
          }
        }
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [shouldReconnect])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    setShouldReconnect(false)
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }

    setDeviceStatus('Disconnected')
    setSavedDevice(null)
    setBatteryLevel(null)
    deviceRef.current = null
  }, [])

  const forgetDevice = useCallback(async () => {
    console.log('Initiating device forget sequence...')
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
      console.warn('Error during device forget:', e)
      setDeviceStatus('Error clearing device permissions.')
    }
  }, [disconnect])

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = 'An unknown error occurred.'
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError')
        msg = 'Connection cancelled. No device selected.'
      else if (error.name === 'SecurityError')
        msg = 'Security error. Use HTTPS or localhost.'
      else if (error.name === 'NetworkError')
        msg = 'Connection failed. Device might be too far or low battery.'
      else msg = `Bluetooth error: ${error.name}`
    } else if (error instanceof Error) {
      if (error.message.includes('timeout'))
        msg = 'Connection timed out. Wake up device and try again.'
      else msg = `Error: ${error.message}`
    }
    setDeviceStatus(`Failed: ${msg}`)
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)
    if (!isManualDisconnect.current && deviceRef.current) {
      console.log('Attempting auto-reconnect...')
      setShouldReconnect(true)
    } else {
      setDeviceStatus('Disconnected')
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      try {
        deviceRef.current = device
        setDeviceStatus(`Connecting to: ${device.name || 'Device'}...`)

        const server = await withTimeout(
          device.gatt!.connect(),
          10000,
          'GATT connection timeout'
        )

        const service = await server.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        try {
          const batteryService = await server.getPrimaryService(
            BATTERY_SERVICE_UUID
          )
          const batteryChar = await batteryService.getCharacteristic(
            BATTERY_LEVEL_CHARACTERISTIC_UUID
          )
          const value = await batteryChar.readValue()
          setBatteryLevel(value.getUint8(0))
          await batteryChar.startNotifications()
          batteryChar.addEventListener('characteristicvaluechanged', (e: Event) => {
              const target = e.target as BluetoothRemoteGATTCharacteristic
              if (target.value) {
                setBatteryLevel(target.value.getUint8(0))
              }
            }
          )
        } catch (err) {
          /* Battery service optional */
        }

        await characteristic.startNotifications()
        lastDataTime.current = Date.now()

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic
            if (!target.value) return

            const heartRate = parseHeartRate(target.value)
            lastDataTime.current = Date.now()

            const { name, age } = userDetailsRef.current || {}
            const calculatedMaxHr = age ? 220 - parseInt(age) : MAX_HR_DEFAULT

            const data: HrmInputData = {
              value: heartRate,
              maxHr: calculatedMaxHr,
              name: name || `Bluetooth HRM (${device.name || 'Unknown'})`,
            }
            if (age && !isNaN(parseInt(age))) data.age = parseInt(age)

            sendData({ type: 'HRM_INPUT', data })
          }
        )

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setDeviceStatus(`Connected to: ${device.name}`)
        setSavedDevice(device)
        setCookie('hrm_device_id', device.id)
        setShouldReconnect(false)
        isManualDisconnect.current = false
        return true
      } catch (error) {
        console.error('GATT Connection failed:', error)
        throw error
      }
    },
    [onDisconnected, sendData]
  )

  const reconnectFn = useCallback(async (): Promise<boolean> => {
    if (!deviceRef.current) return false
    try {
        return await connectToGatt(deviceRef.current)
    } catch (error) {
        console.warn('Auto-reconnect attempt failed:', error)
        return false
    }
  }, [connectToGatt]);

  const { isConnecting: isReconnecting, attempts: reconnectAttempts } = useAutoConnect(reconnectFn, shouldReconnect);

  useEffect(() => {
    if (isReconnecting && reconnectAttempts > 0) {
        setDeviceStatus(`Signal Lost. Retrying (${reconnectAttempts})...`)
    } else if (!isReconnecting && shouldReconnect) {
        setDeviceStatus('Signal Lost. Retrying...')
    }
  }, [isReconnecting, reconnectAttempts, shouldReconnect]);

  const connectAndStream = useCallback(
    async (
      userName?: string,
      userAge?: string,
      isAutoConnect = false
    ): Promise<boolean> => {
      userDetailsRef.current = { name: userName || '', age: userAge || '' }
      if (statusRef.current.startsWith('Connected')) return true
      if (connectionStatus !== 'Connected') {
        setDeviceStatus('Waiting for WebSocket connection...')
        return false
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
              try {
                await connectToGatt(foundDevice)
                return true
              } catch (err) {
                console.warn('Reconnect failed. clearing preference.', err)
                setCookie('hrm_device_id', '', -1)
              }
            }
          }
        }

        if (!device && isAutoConnect) {
          setDeviceStatus('Ready to connect')
          return false
        }

        if (!device) {
          setDeviceStatus('Scanning for devices...')
          try {
            device = await navigator.bluetooth.requestDevice({
              filters: [{ services: [HR_SERVICE_UUID] }],
              optionalServices: [BATTERY_SERVICE_UUID],
            })
          } catch (scanErr) {
            handleConnectionError(scanErr)
            return false
          }
        }

        if (device) {
          await connectToGatt(device)
          return true
        }
        return false
      } catch (error) {
        handleConnectionError(error)
        return false
      }
    },
    [connectionStatus, savedDevice, connectToGatt, handleConnectionError]
  )

  return {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    MAX_HR: MAX_HR_DEFAULT,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported,
  }
}

export default useBluetoothHRM
