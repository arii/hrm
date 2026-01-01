// hooks/useHrm.ts
import { useState, useCallback } from 'react'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_CHARACTERISTIC_UUID = 'battery_level'

export const useHrm = () => {
  const [isSupported] = useState(() => {
    if (typeof navigator !== 'undefined' && navigator.bluetooth) {
      return true
    }
    return false
  })
  const [isConnected, setIsConnected] = useState(false)
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [bluetoothConnected, setBluetoothConnected] = useState(false)
  const [device, setDevice] = useState<BluetoothDevice | null>(null)
  const [hrCharacteristic, setHrCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null)
  const [batteryCharacteristic, setBatteryCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null)
  const [currentHR, setCurrentHR] = useState<number | null>(null)

  const handleHrValueChange = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    const value = characteristic.value
    if (!value) return
    const heartRate = value.getUint8(1)
    setCurrentHR(heartRate)
  }, [])

  const handleBatteryValueChange = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    const value = characteristic.value
    if (!value) return
    const battery = value.getUint8(0)
    setBatteryLevel(battery)
  }, [])

  const onConnect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setDeviceStatus('Bluetooth not supported')
      return
    }

    try {
      setDeviceStatus('Requesting device...')
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE_UUID] }],
        optionalServices: [BATTERY_SERVICE_UUID],
      })

      setDevice(btDevice)
      setDeviceStatus('Connecting to GATT server...')
      const server = await btDevice.gatt?.connect()
      setBluetoothConnected(true)

      setDeviceStatus('Getting HR service...')
      const hrService = await server?.getPrimaryService(HR_SERVICE_UUID)
      const hrChar = await hrService?.getCharacteristic(HR_CHARACTERISTIC_UUID)
      setHrCharacteristic(hrChar!)
      hrChar?.addEventListener(
        'characteristicvaluechanged',
        handleHrValueChange
      )
      await hrChar?.startNotifications()

      try {
        setDeviceStatus('Getting battery service...')
        const batteryService =
          await server?.getPrimaryService(BATTERY_SERVICE_UUID)
        const batteryChar = await batteryService?.getCharacteristic(
          BATTERY_CHARACTERISTIC_UUID
        )
        setBatteryCharacteristic(batteryChar!)
        batteryChar?.addEventListener(
          'characteristicvaluechanged',
          handleBatteryValueChange
        )
        await batteryChar?.startNotifications()
      } catch (_error) {
        console.warn('Battery service not found, proceeding without it.')
      }

      setIsConnected(true)
      setDeviceStatus('Connected')
    } catch (error) {
      console.error(error)
      setDeviceStatus('Failed to connect')
    }
  }, [handleHrValueChange, handleBatteryValueChange])

  const onDisconnect = useCallback(async () => {
    if (device) {
      hrCharacteristic?.removeEventListener(
        'characteristicvaluechanged',
        handleHrValueChange
      )
      batteryCharacteristic?.removeEventListener(
        'characteristicvaluechanged',
        handleBatteryValueChange
      )
      await hrCharacteristic?.stopNotifications()
      await batteryCharacteristic?.stopNotifications()
      device.gatt?.disconnect()
      setIsConnected(false)
      setDeviceStatus('Disconnected')
      setBluetoothConnected(false)
    }
  }, [
    device,
    hrCharacteristic,
    batteryCharacteristic,
    handleHrValueChange,
    handleBatteryValueChange,
  ])

  const onForgetDevice = useCallback(async () => {
    await onDisconnect()
    setDevice(null)
  }, [onDisconnect])

  return {
    isConnected,
    deviceStatus,
    onConnect,
    onDisconnect,
    onForgetDevice,
    isSupported,
    batteryLevel,
    bluetoothConnected,
    currentHR,
  }
}
