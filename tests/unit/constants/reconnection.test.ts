/**
 * @jest-environment jsdom
 */
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_DELAY_INCREMENT_MS,
  RECONNECT_RANDOM_DELAY_MS,
  getBackoffDelay,
} from '@/constants/bluetooth-reconnection'

describe('Reconnection Constants', () => {
  it('should have the correct value for "BLUETOOTH_MAX_RECONNECT_ATTEMPTS"', () => {
    expect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS).toBe(2)
  })

  it('should have the correct value for "RECONNECT_BASE_DELAY_MS"', () => {
    expect(RECONNECT_BASE_DELAY_MS).toBe(5000)
  })

  it('should have the correct value for "RECONNECT_DELAY_INCREMENT_MS"', () => {
    expect(RECONNECT_DELAY_INCREMENT_MS).toBe(1000)
  })

  it('should have the correct value for "RECONNECT_RANDOM_DELAY_MS"', () => {
    expect(RECONNECT_RANDOM_DELAY_MS).toBe(1000)
  })

  describe('getBackoffDelay', () => {
    it('should calculate delay correctly for attempt 1', () => {
      const delay = getBackoffDelay(1)
      // base (5000) * 2^0 + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(5000)
      expect(delay).toBeLessThan(6000)
    })

    it('should calculate delay correctly for attempt 2', () => {
      const delay = getBackoffDelay(2)
      // base (5000) * 2^1 + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(10000)
      expect(delay).toBeLessThan(11000)
    })

    it('should calculate delay correctly for attempt 3', () => {
      const delay = getBackoffDelay(3)
      // base (5000) * 2^2 + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(20000)
      expect(delay).toBeLessThan(21000)
    })

    it('should double the delay for zombie errors', () => {
      const delay = getBackoffDelay(1, true)
      // (base (5000) * 2^0) * 2 + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(10000)
      expect(delay).toBeLessThan(11000)
    })
  })
})
