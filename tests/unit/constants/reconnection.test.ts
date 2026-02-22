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
    expect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS).toBe(8)
  })

  it('should have the correct value for "RECONNECT_BASE_DELAY_MS"', () => {
    expect(RECONNECT_BASE_DELAY_MS).toBe(2000)
  })

  it('should have the correct value for "RECONNECT_DELAY_INCREMENT_MS"', () => {
    expect(RECONNECT_DELAY_INCREMENT_MS).toBe(500)
  })

  it('should have the correct value for "RECONNECT_RANDOM_DELAY_MS"', () => {
    expect(RECONNECT_RANDOM_DELAY_MS).toBe(1000)
  })

  describe('getBackoffDelay', () => {
    it('should calculate delay correctly for attempt 1', () => {
      const delay = getBackoffDelay(1)
      // base (2000) + increment (0) + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(2000)
      expect(delay).toBeLessThan(3000)
    })

    it('should calculate delay correctly for attempt 2', () => {
      const delay = getBackoffDelay(2)
      // base (2000) + increment (500) + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(2500)
      expect(delay).toBeLessThan(3500)
    })

    it('should calculate delay correctly for attempt 3', () => {
      const delay = getBackoffDelay(3)
      // base (2000) + increment (1000) + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(3000)
      expect(delay).toBeLessThan(4000)
    })
  })
})
