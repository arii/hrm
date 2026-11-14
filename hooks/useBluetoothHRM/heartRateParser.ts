/**
 * Parses a heart-rate measurement payload from the standard Bluetooth HR
 * characteristic: the flags byte selects 8- or 16-bit little-endian rate.
 */
export const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}
