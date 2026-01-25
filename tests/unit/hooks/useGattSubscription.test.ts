/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useGattSubscription } from '@/hooks/useGattSubscription';

// Mock the logger to avoid console errors during tests
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('useGattSubscription', () => {
  let mockCharacteristic: jest.Mocked<BluetoothRemoteGATTCharacteristic>;
  let mockService: jest.Mocked<BluetoothRemoteGATTService>;
  let mockServer: jest.Mocked<BluetoothRemoteGATTServer>;
  let mockDevice: jest.Mocked<BluetoothDevice>;

  beforeEach(() => {
    mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      stopNotifications: jest.fn().mockResolvedValue(undefined),
      readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(1))),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      value: null,
    } as any;

    mockService = {
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
    } as any;

    mockServer = {
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
    } as any;

    mockDevice = {
      gatt: {
        connected: true,
        ...mockServer,
      },
    } as any;
  });

  it('should not attempt to subscribe if there is no device', () => {
    renderHook(() => useGattSubscription({ device: null, serviceUuid: 's1', characteristicUuid: 'c1' }));
    expect(mockServer.getPrimaryService).not.toHaveBeenCalled();
  });

  it('should subscribe to the characteristic and start notifications', async () => {
    await act(async () => {
      renderHook(() => useGattSubscription({ device: mockDevice, serviceUuid: 's1', characteristicUuid: 'c1' }));
    });
    expect(mockServer.getPrimaryService).toHaveBeenCalledWith('s1');
    expect(mockService.getCharacteristic).toHaveBeenCalledWith('c1');
    expect(mockCharacteristic.startNotifications).toHaveBeenCalled();
    expect(mockCharacteristic.addEventListener).toHaveBeenCalledWith('characteristicvaluechanged', expect.any(Function));
  });

  it('should call onValueChange with the new value', async () => {
    const onValueChange = jest.fn();
    let capturedCallback: (event: { target: { value: DataView } }) => void = () => {};

    mockCharacteristic.addEventListener.mockImplementation((type, callback) => {
      if (type === 'characteristicvaluechanged') {
        capturedCallback = callback as any;
      }
    });

    await act(async () => {
        renderHook(() => useGattSubscription({ device: mockDevice, serviceUuid: 's1', characteristicUuid: 'c1', onValueChange }));
    });

    const testValue = new DataView(new ArrayBuffer(1));
    testValue.setUint8(0, 123);

    act(() => {
        capturedCallback({ target: { value: testValue } });
    });

    expect(onValueChange).toHaveBeenCalledWith(testValue);
  });

  it('should read the value on connect if readValueOnConnect is true', async () => {
    await act(async () => {
        renderHook(() => useGattSubscription({ device: mockDevice, serviceUuid: 's1', characteristicUuid: 'c1', readValueOnConnect: true }));
    });
    expect(mockCharacteristic.readValue).toHaveBeenCalled();
  });

  it('should set an error state if subscription fails', async () => {
    mockService.getCharacteristic.mockRejectedValue(new Error('Test Error'));
    let result: any;
    await act(async () => {
      const { result: hookResult } = renderHook(() => useGattSubscription({ device: mockDevice, serviceUuid: 's1', characteristicUuid: 'c1' }));
      result = hookResult;
    });

    expect(result.current.error).toContain('Test Error');
  });

  it('should clean up and stop notifications on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
        const { unmount: hookUnmount } = renderHook(() => useGattSubscription({ device: mockDevice, serviceUuid: 's1', characteristicUuid: 'c1' }));
        unmount = hookUnmount;
    });

    act(() => {
        unmount();
    });

    expect(mockCharacteristic.removeEventListener).toHaveBeenCalledWith('characteristicvaluechanged', expect.any(Function));
    expect(mockCharacteristic.stopNotifications).toHaveBeenCalled();
  });
});
