/**
 * @jest-environment jsdom
 */
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'

describe('Bluetooth Message Constants', () => {
  it('should have the correct value for "disconnected"', () => {
    expect(BLUETOOTH_MESSAGES.disconnected).toBe('Disconnected')
  })

  it('should have the correct value for "connecting"', () => {
    expect(BLUETOOTH_MESSAGES.connecting).toBe('Connecting...')
  })

  it('should have the correct value for "connected"', () => {
    expect(BLUETOOTH_MESSAGES.connected).toBe('Connected')
  })

  it('should have the correct value for "reconnecting"', () => {
    expect(BLUETOOTH_MESSAGES.reconnecting).toBe('Reconnecting...')
  })

  it('should generate the correct message for "connectingToDevice"', () => {
    expect(BLUETOOTH_MESSAGES.connectingToDevice('MyHRM')).toBe(
      'Connecting to: MyHRM...'
    )
  })

  it('should generate the correct message for "connectedToDevice"', () => {
    expect(BLUETOOTH_MESSAGES.connectedToDevice('MyHRM')).toBe(
      'Connected to: MyHRM'
    )
  })

  it('should generate the correct message for "failedToReconnect"', () => {
    expect(BLUETOOTH_MESSAGES.failedToReconnect(5)).toBe(
      'Failed to reconnect after 5 attempts. Resetting device...'
    )
  })

  it('should generate the correct message for "reconnectingAttempt"', () => {
    expect(BLUETOOTH_MESSAGES.reconnectingAttempt('Signal Lost', 2, 5)).toBe(
      'Signal Lost. Reconnecting... (Attempt 2/5)'
    )
  })

  it('should have the correct value for "unstableConnection"', () => {
    expect(BLUETOOTH_MESSAGES.unstableConnection).toBe(
      'Connection unstable. Reconnecting...'
    )
  })

  it('should generate the correct message for "deviceBusy"', () => {
    expect(BLUETOOTH_MESSAGES.deviceBusy(2000, 1, 3)).toBe(
      'Device busy (Zombie). Retrying in 2s... (1/3)'
    )
  })
})
