/**
 * @jest-environment jsdom
 */
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
} from '@/constants/bluetooth-reconnection'

describe('Reconnection Constants', () => {
  it('should have the correct value for "BLUETOOTH_MAX_RECONNECT_ATTEMPTS"', () => {
    expect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS).toBe(5)
  })

  it('should have the correct value for "RECONNECT_BASE_DELAY_MS"', () => {
    expect(RECONNECT_BASE_DELAY_MS).toBe(1000)
  })
})
