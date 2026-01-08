/**
 * @file hooks/useGattCharacteristics.ts
 * @description This hook manages the discovery of and interaction with GATT characteristics
 * for a given Bluetooth GATT server. It is responsible for finding the heart rate
 * and battery services, subscribing to notifications, and parsing the incoming data.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  HR_SERVICE_UUID,
  HR_CHARACTERISTIC_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHARACTERISTIC_UUID,
  parseHeartRate,
} from '@/lib/bluetoothUtils'
import logger from '@/utils/logger'

interface UseGattCharacteristicsProps {
  server: BluetoothRemoteGATTServer | null
  onHeartRateUpdate?: (heartRate: number) => void
}

interface UseGattCharacteristicsReturn {
  setupCharacteristics: () => Promise<void>
  batteryLevel: number | null
}

/**
 * @hook useGattCharacteristics
 * @description Manages the discovery and interaction with GATT characteristics.
 *
 * @param {UseGattCharacteristicsProps} props - The props for the hook.
 * @returns {UseGattCharacteristicsReturn} An object containing functions and state
 * for managing GATT characteristics.
 */
export const useGattCharacteristics = ({
  server,
  onHeartRateUpdate,
}: UseGattCharacteristicsProps): UseGattCharacteristicsReturn => {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

  const handleHeartRateChanged = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const heartRate = parseHeartRate(target.value!)
    onHeartRateUpdateRef.current?.(heartRate)
  }, [])

  const handleBatteryLevelChanged = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    setBatteryLevel(target.value!.getUint8(0))
  }, [])

  const setupCharacteristics = useCallback(async () => {
    if (!server) return

    try {
      const service = await server.getPrimaryService(HR_SERVICE_UUID)
      const characteristic = await service.getCharacteristic(
        HR_CHARACTERISTIC_UUID
      )
      await characteristic.startNotifications()
      characteristic.addEventListener(
        'characteristicvaluechanged',
        handleHeartRateChanged
      )

      try {
        const batteryService =
          await server.getPrimaryService(BATTERY_SERVICE_UUID)
        const batteryChar = await batteryService.getCharacteristic(
          BATTERY_LEVEL_CHARACTERISTIC_UUID
        )
        const value = await batteryChar.readValue()
        setBatteryLevel(value.getUint8(0))
        await batteryChar.startNotifications()
        batteryChar.addEventListener(
          'characteristicvaluechanged',
          handleBatteryLevelChanged
        )
      } catch (err) {
        logger.warn('Battery service not found. This is optional.')
      }
    } catch (err) {
      logger.error({ error: err }, 'Failed to set up characteristics')
      throw err
    }
  }, [server, handleHeartRateChanged, handleBatteryLevelChanged])

  return { setupCharacteristics, batteryLevel }
}
