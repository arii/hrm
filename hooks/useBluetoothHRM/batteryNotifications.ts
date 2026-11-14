import logger from '@/utils/logger'
import {
  BATTERY_LEVEL_CHARACTERISTIC_UUID,
  BATTERY_SERVICE_UUID,
} from './constants'

/**
 * Best-effort battery subscription (#9596). The battery service is optional
 * on HR straps: any failure resolves silently and the dashboard simply
 * shows no battery level.
 */
export const setupBatteryNotifications = async (
  server: BluetoothRemoteGATTServer,
  onBatteryLevel: (level: number) => void
): Promise<void> => {
  try {
    const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID)
    const batteryChar = await batteryService.getCharacteristic(
      BATTERY_LEVEL_CHARACTERISTIC_UUID
    )
    const value = await batteryChar.readValue()
    onBatteryLevel(value.getUint8(0))
    await batteryChar.startNotifications()
    batteryChar.addEventListener('characteristicvaluechanged', (e: unknown) => {
      const event = e as Event
      const target = event.target as BluetoothRemoteGATTCharacteristic
      onBatteryLevel(target.value!.getUint8(0))
    })
  } catch (error) {
    // Best-effort: the battery service is optional on HR straps, but a
    // failed read should leave a trace instead of a silent mystery.
    logger.debug({ error }, 'Battery service unavailable; skipping level')
  }
}
