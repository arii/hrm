/**
 * @file lib/bluetoothUtils.ts
 * @description This file contains constants and utility functions for interacting with Bluetooth Low Energy (BLE) devices.
 */

export const HR_SERVICE_UUID = 'heart_rate'
export const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
export const BATTERY_SERVICE_UUID = 'battery_service'
export const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

/**
 * @function parseHeartRate
 * @description Parses the heart rate value from the raw DataView received from a BLE device.
 * It handles both 8-bit and 16-bit heart rate value formats based on the flags.
 * @param {DataView} value - The raw data from the heart rate measurement characteristic.
 * @returns {number} The parsed heart rate in beats per minute.
 */
export const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}
