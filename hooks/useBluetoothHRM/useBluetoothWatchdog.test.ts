/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useBluetoothWatchdog } from '../useBluetoothHRM/useBluetoothWatchdog';
import { BluetoothConnectionStatus } from '../../types/bluetooth';

describe('useBluetoothWatchdog', () => {
  it('should trigger onDisconnect if data goes stale', async () => {
    jest.useFakeTimers();
    const onDisconnect = jest.fn();
    const statusRef = { current: BluetoothConnectionStatus.CONNECTED };
    const lastDataTime = { current: Date.now() };
    const avgPeriodMs = { current: 1000 };
    const deviceRef = { current: {} as BluetoothDevice };
    const updateSignalPeriod = jest.fn();

    renderHook(() =>
      useBluetoothWatchdog({
        dataLivenessTimeoutMs: 5000,
        statusRef,
        lastDataTime,
        avgPeriodMs,
        deviceRef,
        updateSignalPeriod,
        onDisconnect,
      })
    );

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
