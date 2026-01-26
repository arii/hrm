/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import useBluetoothHRM from '../useBluetoothHRM';
import { useBluetoothConnection } from '../useBluetoothHRM/useBluetoothConnection';
import { useHRMDataSubscription } from '../useBluetoothHRM/useHRMDataSubscription';
import { useBluetoothWatchdog } from '../useBluetoothHRM/useBluetoothWatchdog';

jest.mock('../useBluetoothHRM/useBluetoothConnection');
jest.mock('../useBluetoothHRM/useHRMDataSubscription');
jest.mock('../useBluetoothHRM/useBluetoothWatchdog');

const mockUseBluetoothConnection = useBluetoothConnection as jest.Mock;
const mockUseHRMDataSubscription = useHRMDataSubscription as jest.Mock;
const mockUseBluetoothWatchdog = useBluetoothWatchdog as jest.Mock;

describe('useBluetoothHRM', () => {
  beforeEach(() => {
    mockUseBluetoothConnection.mockReturnValue({
      connectAndStream: jest.fn(),
      autoConnect: jest.fn(),
      disconnect: jest.fn(),
      forgetDevice: jest.fn(),
      deviceStatus: 'Disconnected',
      isConnected: false,
      isSupported: true,
      deviceRef: { current: null },
    });

    mockUseHRMDataSubscription.mockReturnValue({
      batteryLevel: null,
      signalPeriodMs: 0,
      lastDataTime: { current: 0 },
      avgPeriodMs: { current: 0 },
      handleGattServerConnected: jest.fn(),
      updateSignalPeriod: jest.fn(),
      reset: jest.fn(),
    });

    mockUseBluetoothWatchdog.mockReturnValue({
      isDataStale: false,
    });
  });

  it('should return the correct initial state', () => {
    const { result } = renderHook(() => useBluetoothHRM());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.deviceStatus).toBe('Disconnected');
    expect(result.current.batteryLevel).toBeNull();
    expect(result.current.isDataStale).toBe(false);
    expect(result.current.signalPeriodMs).toBe(0);
  });

  it('should call the underlying hooks with the correct parameters', () => {
    const onHeartRateUpdate = jest.fn();
    const onConnect = jest.fn();

    renderHook(() =>
      useBluetoothHRM({
        dataLivenessTimeoutMs: 5000,
        onHeartRateUpdate,
        onConnect,
      })
    );

    expect(mockUseHRMDataSubscription).toHaveBeenCalledWith({ onHeartRateUpdate });
    expect(mockUseBluetoothConnection).toHaveBeenCalled();
    expect(mockUseBluetoothWatchdog).toHaveBeenCalledWith(
      expect.objectContaining({
        dataLivenessTimeoutMs: 5000,
      })
    );
  });
});
