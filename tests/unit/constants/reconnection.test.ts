/**
 * @jest-environment jsdom
 */
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_DELAY_INCREMENT_MS,
  RECONNECT_RANDOM_DELAY_MS,
} from '@/constants/reconnection'

describe('Reconnection Constants', () => {
  it('should have the correct value for "MAX_RECONNECT_ATTEMPTS"', () => {
    expect(MAX_RECONNECT_ATTEMPTS).toBe(5)
  })

  it('should have the correct value for "RECONNECT_BASE_DELAY_MS"', () => {
    expect(RECONNECT_BASE_DELAY_MS).toBe(1000)
  })

  it('should have the correct value for "RECONNECT_DELAY_INCREMENT_MS"', () => {
    expect(RECONNECT_DELAY_INCREMENT_MS).toBe(500)
  })

  it('should have the correct value for "RECONNECT_RANDOM_DELAY_MS"', () => {
    expect(RECONNECT_RANDOM_DELAY_MS).toBe(1000)
  })
})
