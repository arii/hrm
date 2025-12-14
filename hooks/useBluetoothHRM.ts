// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'

const useBluetoothHRM = () => {
  const [device, setDevice] = useState(null)
  const [heartRate, setHeartRate] = useState(0)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const { settings, setSetting } = useUserSettings()

  const connect = useCallback(async () => {
    setStatus('connecting')
    try {
      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      })
      setDevice(bleDevice)
      setSetting('deviceId', bleDevice.id)
      const server = await bleDevice.gatt.connect()
      const service = await server.getPrimaryService('heart_rate')
      const characteristic = await service.getCharacteristic(
        'heart_rate_measurement'
      )
      await characteristic.startNotifications()
      characteristic.addEventListener(
        'characteristicvaluechanged',
        (event) => {
          const value = event.target.value
          const newHeartRate = value.getUint8(1)
          setHeartRate(newHeartRate)
          setStatus('connected')
        }
      )
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [setSetting])

  const disconnect = useCallback(() => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect()
      setDevice(null)
      setHeartRate(0)
      setStatus('disconnected')
    }
  }, [device])

  useEffect(() => {
    const autoConnect = async () => {
      if (settings.deviceId) {
        const pairedDevices = await navigator.bluetooth.getDevices()
        const deviceToConnect = pairedDevices.find(
          (d) => d.id === settings.deviceId
        )
        if (deviceToConnect) {
          setDevice(deviceToConnect)
          connect()
        }
      }
    }
    autoConnect()
  }, [settings.deviceId, connect])

  return { device, heartRate, error, status, connect, disconnect }
}

export default useBluetoothHRM
