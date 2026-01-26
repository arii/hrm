/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useBluetoothConnection } from '../useBluetoothHRM/useBluetoothConnection';
import * as cookieUtils from '../../utils/cookies';

jest.mock('../../utils/cookies');

describe('useBluetoothConnection', () => {
  let mockGatt: jest.Mock;
  let mockDevice: jest.Mock;
  let mockBluetooth: jest.Mock;
  let onGattServerConnected: jest.Mock;

  beforeEach(() => {
    onGattServerConnected = jest.fn().mockResolvedValue(undefined);
    mockGatt = {
      connect: jest.fn().mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue({
            startNotifications: jest.fn().mockResolvedValue(undefined),
            addEventListener: jest.fn(),
          }),
        }),
      }),
      disconnect: jest.fn(),
    };
    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: mockGatt,
      addEventListener: jest.fn(),
    };
    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
      getDevices: jest.fn().mockResolvedValue([]),
    };
    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
      configurable: true,
    });
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('');
    jest.spyOn(cookieUtils, 'setCookie').mockImplementation(() => {});
  });

  it('should auto-connect to a saved device', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id');
    mockBluetooth.getDevices.mockResolvedValue([mockDevice]);
    const { result } = renderHook(() => useBluetoothConnection(onGattServerConnected));

    await act(async () => {
      await result.current.autoConnect();
    });

    expect(mockBluetooth.getDevices).toHaveBeenCalled();
    expect(mockGatt.connect).toHaveBeenCalled();
    expect(result.current.deviceStatus).toBe('Connected to: Test HRM');
  });
});
