/**
 * @file types/bluetooth.ts
 * @description Defines TypeScript types and enums related to Bluetooth functionality.
 */

/**
 * @enum BluetoothConnectionStatus
 * @description Represents the distinct states of a Bluetooth device connection lifecycle.
 */
export enum BluetoothConnectionStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
  CONNECTED_HR_ONLY = 'Connected (HR only)',
  RECONNECTING = 'Reconnecting',
  ERROR = 'Error',
  UNSUPPORTED = 'Unsupported',
}
