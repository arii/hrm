import { BluetoothConnectionStatus } from '@/types/bluetooth'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'

export const HR_SERVICE_UUID = 'heart_rate'
export const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
export const BATTERY_SERVICE_UUID = 'battery_service'
export const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

export const HEARTBEAT_INTERVAL_MS = 1000

export const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: BLUETOOTH_MESSAGES.disconnected,
  [BluetoothConnectionStatus.CONNECTING]: BLUETOOTH_MESSAGES.connecting,
  [BluetoothConnectionStatus.CONNECTED]: BLUETOOTH_MESSAGES.connected,
  [BluetoothConnectionStatus.RECONNECTING]: BLUETOOTH_MESSAGES.reconnecting,
  [BluetoothConnectionStatus.ERROR]: BLUETOOTH_MESSAGES.error,
}
