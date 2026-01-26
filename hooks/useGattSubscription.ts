import { useState, useEffect, useRef } from 'react'
import logger from '@/utils/logger'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

interface UseGattSubscriptionProps {
  server: BluetoothRemoteGATTServer | null
  onHeartRateUpdate: (heartRate: number) => void
}

const useGattSubscription = ({
  server,
  onHeartRateUpdate,
}: UseGattSubscriptionProps) => {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number>(0)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

  useEffect(() => {
    if (!server || !server.connected) {
      return
    }

    let hrCharacteristic: BluetoothRemoteGATTCharacteristic
    let batteryCharacteristic: BluetoothRemoteGATTCharacteristic

    const handleHeartRateChanged = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      if (!target.value) return
      const heartRate = parseHeartRate(target.value)
      onHeartRateUpdateRef.current?.(heartRate)
      setLastDataTimestamp(Date.now())
    }

    const handleBatteryLevelChanged = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      if (!target.value) return
      setBatteryLevel(target.value.getUint8(0))
    }

    const subscribe = async () => {
      try {
        const hrService = await server.getPrimaryService(HR_SERVICE_UUID)
        hrCharacteristic = await hrService.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )
        await hrCharacteristic.startNotifications()
        hrCharacteristic.addEventListener(
          'characteristicvaluechanged',
          handleHeartRateChanged
        )
        logger.info('Subscribed to Heart Rate notifications')

        try {
          const batteryService =
            await server.getPrimaryService(BATTERY_SERVICE_UUID)
          batteryCharacteristic = await batteryService.getCharacteristic(
            BATTERY_LEVEL_CHARACTERISTIC_UUID
          )
          const value = await batteryCharacteristic.readValue()
          setBatteryLevel(value.getUint8(0))
          await batteryCharacteristic.startNotifications()
          batteryCharacteristic.addEventListener(
            'characteristicvaluechanged',
            handleBatteryLevelChanged
          )
          logger.info('Subscribed to Battery Level notifications')
        } catch (error) {
          logger.warn('Battery service not found or failed to subscribe', error)
        }

        setLastDataTimestamp(Date.now())
      } catch (error) {
        logger.error('Failed to subscribe to GATT characteristics', error)
      }
    }

    subscribe()

    return () => {
      const unsubscribe = async () => {
        try {
          if (hrCharacteristic && server.connected) {
            hrCharacteristic.removeEventListener(
              'characteristicvaluechanged',
              handleHeartRateChanged
            )
            await hrCharacteristic.stopNotifications()
          }
          if (batteryCharacteristic && server.connected) {
            batteryCharacteristic.removeEventListener(
              'characteristicvaluechanged',
              handleBatteryLevelChanged
            )
            await batteryCharacteristic.stopNotifications()
          }
        } catch (error) {
          logger.warn('Error during GATT unsubscription', error)
        }
      }
      unsubscribe()
    }
  }, [server])

  return { batteryLevel, lastDataTimestamp }
}

export default useGattSubscription
