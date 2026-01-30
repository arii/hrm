/**
 * @file This file contains types related to Bluetooth functionality.
 */

/**
 * Represents the various states of a Bluetooth device connection.
 * Used to manage UI and connection logic throughout the application.
 */
export enum BluetoothConnectionStatus {
  /** The device is not connected and no connection attempt is in progress. */
  DISCONNECTED,
  /** An initial connection attempt is in progress. */
  CONNECTING,
  /** The device is successfully connected and streaming data. */
  CONNECTED,
  /** A reconnection attempt is in progress after a disconnection. */
  RECONNECTING,
  /** An error has occurred. The device is not connected. */
  ERROR,
}
