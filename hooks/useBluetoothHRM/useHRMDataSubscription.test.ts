/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useHRMDataSubscription } from '../useBluetoothHRM/useHRMDataSubscription';

describe('useHRMDataSubscription', () => {
  it('should calculate the rolling average of signal period', async () => {
    const { result } = renderHook(() => useHRMDataSubscription({}));

    act(() => {
      result.current.updateSignalPeriod(1000);
      result.current.updateSignalPeriod(1050);
    });

    expect(result.current.signalPeriodMs).toBe(1025);
  });
});
