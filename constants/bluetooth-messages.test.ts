/**
 * @file bluetooth-messages.test.ts
 * @description Unit tests for the Bluetooth message constants defined in `constants/bluetooth-messages.ts`.
 * These tests ensure that both static and parameterized message constants are correct and prevent
 * regressions in user-facing text.
 */
import { BLUETOOTH_MESSAGES } from './bluetooth-messages';

describe('Bluetooth Message Constants', () => {
  describe('Static Messages', () => {
    it('should have the correct string for disconnected', () => {
      expect(BLUETOOTH_MESSAGES.disconnected).toBe('Disconnected');
    });

    it('should have the correct string for connecting', () => {
      expect(BLUETOOTH_MESSAGES.connecting).toBe('Connecting...');
    });

    it('should have the correct string for connected', () => {
      expect(BLUETOOTH_MESSAGES.connected).toBe('Connected');
    });

    it('should have the correct string for reconnecting', () => {
      expect(BLUETOOTH_MESSAGES.reconnecting).toBe('Reconnecting...');
    });

    it('should have the correct string for unstableConnection', () => {
      expect(BLUETOOTH_MESSAGES.unstableConnection).toBe('Connection unstable. Reconnecting...');
    });

    it('should have the correct string for devicePermissionsRevoked', () => {
      expect(BLUETOOTH_MESSAGES.devicePermissionsRevoked).toBe('Device permissions revoked. Ready for new connection.');
    });
  });

  describe('Parameterized Messages', () => {
    it('should generate the correct connectingToDevice message', () => {
      expect(BLUETOOTH_MESSAGES.connectingToDevice('My HRM')).toBe('Connecting to: My HRM...');
      expect(BLUETOOTH_MESSAGES.connectingToDevice('')).toBe('Connecting to: Device...');
    });

    it('should generate the correct connectedToDevice message', () => {
      expect(BLUETOOTH_MESSAGES.connectedToDevice('My HRM')).toBe('Connected to: My HRM');
    });

    it('should generate the correct failedToReconnect message', () => {
      expect(BLUETOOTH_MESSAGES.failedToReconnect(5)).toBe('Failed to reconnect after 5 attempts. Resetting device...');
    });

    it('should generate the correct reconnectingAttempt message', () => {
      expect(BLUETOOTH_MESSAGES.reconnectingAttempt('Signal Lost', 2, 5)).toBe('Signal Lost. Reconnecting... (Attempt 2/5)');
    });

    it('should generate the correct errorWithDetails message', () => {
      expect(BLUETOOTH_MESSAGES.errorWithDetails('Test Error')).toBe('Failed: Test Error');
    });

    it('should generate the correct bluetoothError message', () => {
      expect(BLUETOOTH_MESSAGES.bluetoothError('GATT Error')).toBe('Bluetooth error: GATT Error');
    });
  });
});
