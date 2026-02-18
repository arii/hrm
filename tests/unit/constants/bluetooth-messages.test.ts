/** @jest-environment jsdom */
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'

describe('Bluetooth Message Constants', () => {
  describe('Connection Statuses', () => {
    it('should have the correct string for disconnected', () => {
      expect(BLUETOOTH_MESSAGES.disconnected).toBe('Disconnected')
    })

    it('should have the correct string for connecting', () => {
      expect(BLUETOOTH_MESSAGES.connecting).toBe('Connecting...')
    })

    it('should have the correct string for connected', () => {
      expect(BLUETOOTH_MESSAGES.connected).toBe('Connected')
    })

    it('should have the correct string for reconnecting', () => {
      expect(BLUETOOTH_MESSAGES.reconnecting).toBe('Reconnecting...')
    })
  })

  describe('Custom Status Messages', () => {
    it('should have the correct string for unstableConnection', () => {
      expect(BLUETOOTH_MESSAGES.unstableConnection).toBe(
        'Connection unstable. Reconnecting...'
      )
    })

    it('should have the correct string for devicePermissionsRevoked', () => {
      expect(BLUETOOTH_MESSAGES.devicePermissionsRevoked).toBe(
        'Device permissions revoked. Ready for new connection.'
      )
    })

    it('should generate the correct connectingToDevice message', () => {
      expect(BLUETOOTH_MESSAGES.connectingToDevice('My HRM')).toBe(
        'Connecting to: My HRM...'
      )
      expect(BLUETOOTH_MESSAGES.connectingToDevice('')).toBe(
        'Connecting to: Device...'
      )
    })

    it('should generate the correct connectedToDevice message', () => {
      expect(BLUETOOTH_MESSAGES.connectedToDevice('My HRM')).toBe(
        'Connected to: My HRM'
      )
    })

    it('should generate the correct failedToReconnect message', () => {
      expect(BLUETOOTH_MESSAGES.failedToReconnect(5)).toBe(
        'Failed to reconnect after 5 attempts. Resetting device...'
      )
    })

    it('should generate the correct reconnectingAttempt message', () => {
      expect(BLUETOOTH_MESSAGES.reconnectingAttempt('Signal Lost', 2, 5)).toBe(
        'Signal Lost. Reconnecting... (Attempt 2/5)'
      )
    })

    it('should have the correct string for checkingSavedDevices', () => {
      expect(BLUETOOTH_MESSAGES.checkingSavedDevices).toBe(
        'Checking saved devices...'
      )
    })

    it('should have the correct string for scanningForDevices', () => {
      expect(BLUETOOTH_MESSAGES.scanningForDevices).toBe(
        'Scanning for devices...'
      )
    })

    it('should have the correct string for autoConnectFailed', () => {
      expect(BLUETOOTH_MESSAGES.autoConnectFailed).toBe(
        'Auto-connect failed. Use Connect button to select device.'
      )
    })

    it('should have the correct string for connectingToSavedDevice', () => {
      expect(BLUETOOTH_MESSAGES.connectingToSavedDevice).toBe(
        'Connecting to saved device...'
      )
    })

  })

  describe('Error Messages', () => {
    it('should have the correct string for error', () => {
      expect(BLUETOOTH_MESSAGES.error).toBe('Error')
    })

    it('should generate the correct errorWithDetails message', () => {
      expect(BLUETOOTH_MESSAGES.errorWithDetails('Test Error')).toBe(
        'Failed: Test Error'
      )
    })

    it('should have the correct string for errorClearingPermissions', () => {
      expect(BLUETOOTH_MESSAGES.errorClearingPermissions).toBe(
        'Error clearing device permissions.'
      )
    })

    it('should have the correct string for connectionCancelled', () => {
      expect(BLUETOOTH_MESSAGES.connectionCancelled).toBe(
        'Connection cancelled. No device selected.'
      )
    })

    it('should have the correct string for securityError', () => {
      expect(BLUETOOTH_MESSAGES.securityError).toBe(
        'Security error. Use HTTPS or localhost.'
      )
    })

    it('should have the correct string for connectionFailed', () => {
      expect(BLUETOOTH_MESSAGES.connectionFailed).toBe(
        'Connection failed. Device might be too far or low battery.'
      )
    })

    it('should generate the correct bluetoothError message', () => {
      expect(BLUETOOTH_MESSAGES.bluetoothError('GATT Error')).toBe(
        'Bluetooth error: GATT Error'
      )
    })

    it('should have the correct string for connectionTimeout', () => {
      expect(BLUETOOTH_MESSAGES.connectionTimeout).toBe(
        'Connection timed out. Wake up device and try again.'
      )
    })

    it('should have the correct string for connectionTimeoutReset', () => {
      expect(BLUETOOTH_MESSAGES.connectionTimeoutReset).toBe(
        'Connection timeout. Resetting device...'
      )
    })

    it('should have the correct string for unknownError', () => {
      expect(BLUETOOTH_MESSAGES.unknownError).toBe('An unknown error occurred.')
    })
  })
})
