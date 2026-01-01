// hooks/useHrm.ts
import { useState } from 'react'

export const useHrm = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [batteryLevel, _setBatteryLevel] = useState<number | null>(null)
  const [bluetoothConnected, setBluetoothConnected] = useState(false)

  const onConnect = () => {
    setIsConnected(true)
    setDeviceStatus('Connected')
    setBluetoothConnected(true)
  }

  const onDisconnect = () => {
    setIsConnected(false)
    setDeviceStatus('Disconnected')
    setBluetoothConnected(false)
  }

  const onForgetDevice = () => {
    setIsConnected(false)
    setDeviceStatus('Disconnected')
    setBluetoothConnected(false)
  }

  return {
    isConnected,
    deviceStatus,
    onConnect,
    onDisconnect,
    onForgetDevice,
    isSupported: true, // Assuming supported for now
    batteryLevel,
    bluetoothConnected,
  }
}
