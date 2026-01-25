/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useSignalQuality } from '@/hooks/useSignalQuality';

describe('useSignalQuality', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with a signal period of 0', () => {
    const { result } = renderHook(() => useSignalQuality({ lastDataTimestamp: 0 }));
    expect(result.current.signalPeriodMs).toBe(0);
  });

  it('should calculate the signal period based on the delta between timestamps', () => {
    const { result, rerender } = renderHook(
      ({ lastDataTimestamp }) => useSignalQuality({ lastDataTimestamp }),
      { initialProps: { lastDataTimestamp: 0 } }
    );

    // First packet
    rerender({ lastDataTimestamp: 1000 });
    // No period yet, as we need two packets to get a delta
    expect(result.current.signalPeriodMs).toBe(0);

    // Second packet
    rerender({ lastDataTimestamp: 2050 });
    expect(result.current.signalPeriodMs).toBe(1050); // 2050 - 1000

    // Third packet
    rerender({ lastDataTimestamp: 3050 });
    expect(result.current.signalPeriodMs).toBe(1025); // Avg of 1050 and 1000
  });

  it('should proactively increase signal period on missed heartbeats', () => {
    const { result, rerender } = renderHook(
      ({ lastDataTimestamp }) => useSignalQuality({ lastDataTimestamp }),
      { initialProps: { lastDataTimestamp: 0 } }
    );

    rerender({ lastDataTimestamp: 1000 });
    rerender({ lastDataTimestamp: 2000 });
    expect(result.current.signalPeriodMs).toBe(1000);

    // Advance time by 2 seconds without a new packet
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // The heartbeat runs every second.
    // At 3000ms, timeSinceLastData is 1000ms. No penalty.
    // At 4000ms, timeSinceLastData is 2000ms. Threshold is ~1500ms. Penalty applied.
    // History becomes [1000, 2000]. Average is 1500.
    expect(result.current.signalPeriodMs).toBe(1500);
  });

  it('should reset the signal quality metrics when resetSignalQuality is called', () => {
    const { result, rerender } = renderHook(
      ({ lastDataTimestamp }) => useSignalQuality({ lastDataTimestamp }),
      { initialProps: { lastDataTimestamp: 0 } }
    );

    rerender({ lastDataTimestamp: 1000 });
    rerender({ lastDataTimestamp: 2000 });
    expect(result.current.signalPeriodMs).toBe(1000);

    act(() => {
      result.current.resetSignalQuality();
    });

    expect(result.current.signalPeriodMs).toBe(0);
  });

  it('should not update the period if the hook is disabled', () => {
    const { result, rerender } = renderHook(
        ({ lastDataTimestamp, isEnabled }) => useSignalQuality({ lastDataTimestamp, isEnabled }),
        { initialProps: { lastDataTimestamp: 0, isEnabled: true } }
    );

    rerender({ lastDataTimestamp: 1000, isEnabled: true });
    rerender({ lastDataTimestamp: 2000, isEnabled: false });

    // The period should not be calculated because the hook was disabled on the second packet
    expect(result.current.signalPeriodMs).toBe(0);

    // Heartbeat should not run either
    act(() => {
        jest.advanceTimersByTime(3000);
    });
    expect(result.current.signalPeriodMs).toBe(0);
  });
});
