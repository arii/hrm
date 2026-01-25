/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDataLiveness } from '@/hooks/useDataLiveness';

describe('useDataLiveness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with isDataStale as false', () => {
    const { result } = renderHook(() => useDataLiveness({ lastDataTimestamp: 0, timeoutMs: 5000 }));
    expect(result.current.isDataStale).toBe(false);
  });

  it('should mark data as stale when the timeout is exceeded', () => {
    const onStale = jest.fn();
    const { result } = renderHook(() =>
      useDataLiveness({ lastDataTimestamp: Date.now(), timeoutMs: 5000, onStale })
    );

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(result.current.isDataStale).toBe(true);
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('should not mark data as stale if a new timestamp arrives before the timeout', () => {
    const { result, rerender } = renderHook(
      ({ lastDataTimestamp }) => useDataLiveness({ lastDataTimestamp, timeoutMs: 5000 }),
      { initialProps: { lastDataTimestamp: Date.now() } }
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    rerender({ lastDataTimestamp: Date.now() });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.isDataStale).toBe(false);
  });

  it('should call onFresh when a stale stream receives new data', () => {
    const onStale = jest.fn();
    const onFresh = jest.fn();
    let timestamp = Date.now();

    const { result, rerender } = renderHook(
      ({ lastDataTimestamp }) => useDataLiveness({ lastDataTimestamp, timeoutMs: 5000, onStale, onFresh }),
      { initialProps: { lastDataTimestamp: timestamp } }
    );

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(result.current.isDataStale).toBe(true);
    expect(onStale).toHaveBeenCalledTimes(1);

    rerender({ lastDataTimestamp: Date.now() });

    // The check interval needs to run for the hook to update
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isDataStale).toBe(false);
    expect(onFresh).toHaveBeenCalledTimes(1);
  });

  it('should not do anything if isEnabled is false', () => {
    const onStale = jest.fn();
    const { result } = renderHook(() =>
      useDataLiveness({ lastDataTimestamp: Date.now(), timeoutMs: 5000, onStale, isEnabled: false })
    );

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(result.current.isDataStale).toBe(false);
    expect(onStale).not.toHaveBeenCalled();
  });

  it('should do nothing if timeoutMs is 0', () => {
    const { result } = renderHook(() =>
      useDataLiveness({ lastDataTimestamp: Date.now(), timeoutMs: 0 })
    );

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(result.current.isDataStale).toBe(false);
  });
});
