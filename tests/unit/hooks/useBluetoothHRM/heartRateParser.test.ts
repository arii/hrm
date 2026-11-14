import { parseHeartRate } from '@/hooks/useBluetoothHRM/heartRateParser'

const dataView = (bytes: number[]): DataView =>
  new DataView(new Uint8Array(bytes).buffer)

describe('parseHeartRate', () => {
  it('parses an 8-bit measurement (flags bit 0 clear)', () => {
    // flags: 0x00 (8-bit, no other formats), value: 0x48 = 72 bpm
    expect(parseHeartRate(dataView([0x00, 0x48]))).toBe(72)
  })

  it('parses a 16-bit little-endian measurement (flags bit 0 set)', () => {
    // flags: 0x01 (16-bit), value bytes 0x02 0x01 little-endian = 0x0102 = 258 bpm
    expect(parseHeartRate(dataView([0x01, 0x02, 0x01]))).toBe(258)
  })

  it('parses the maximum 8-bit value', () => {
    expect(parseHeartRate(dataView([0x00, 0xff]))).toBe(255)
  })

  it('parses a 16-bit value that only needs one byte of range', () => {
    // flags: 0x01, value: 0x9c 0x00 little-endian = 156 bpm
    expect(parseHeartRate(dataView([0x01, 0x9c, 0x00]))).toBe(156)
  })
})
