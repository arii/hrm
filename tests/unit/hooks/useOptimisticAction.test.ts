/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useOptimisticAction.test.ts
import { renderHook, act } from '@testing-library/react';
import { useOptimisticAction } from '../../../hooks/useOptimisticAction'

// Use fake timers to control setTimeout
jest.useFakeTimers()

describe('useOptimisticAction', () => {
  it('should return the server state initially', () => {
    const { result } = renderHook(() => useOptimisticAction(false))
    expect(result.current.isRunning).toBe(false)
  })

  it('should optimistically update to true when START is set', () => {
    const { result } = renderHook(() => useOptimisticAction(false))
    act(() => {
      result.current.setOptimisticAction('START')
    })
    expect(result.current.isRunning).toBe(true)
  })

  it('should optimistically update to false when STOP is set', () => {
    const { result } = renderHook(() => useOptimisticAction(true))
    act(() => {
      result.current.setOptimisticAction('STOP')
    })
    expect(result.current.isRunning).toBe(false)
  })

  it('should revert to server state after timeout', () => {
    const { result } = renderHook(() => useOptimisticAction(false))
    act(() => {
      result.current.setOptimisticAction('START')
    })
    expect(result.current.isRunning).toBe(true)

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.isRunning).toBe(false)
  })

  it('should clear optimistic action on server confirmation', () => {
    const { result, rerender } = renderHook(
      ({ serverIsRunning }) => useOptimisticAction(serverIsRunning),
      { initialProps: { serverIsRunning: false } }
    )

    act(() => {
      result.current.setOptimisticAction('START')
    })
    expect(result.current.isRunning).toBe(true)

    // Rerender with the new server state
    rerender({ serverIsRunning: true })

    // isRunning should still be true, but the internal optimisticAction should be null
    expect(result.current.isRunning).toBe(true)

    // To verify the optimistic state is cleared, we can check if a timeout would revert it.
    // If the optimistic state was cleared, the timeout will not fire.
    // Let's change the server state back and see if the optimistic state is still gone.
    rerender({ serverIsRunning: false })
    expect(result.current.isRunning).toBe(false)
  })

  it('should not revert if confirmed before timeout', () => {
    const { result, rerender } = renderHook(
        ({ serverIsRunning }) => useOptimisticAction(serverIsRunning),
        { initialProps: { serverIsRunning: false } }
    );

    act(() => {
        result.current.setOptimisticAction('START');
    });
    expect(result.current.isRunning).toBe(true);

    // Fast-forward time, but not enough to trigger the timeout
    act(() => {
        jest.advanceTimersByTime(1500);
    });

    // Rerender with the new server state (confirmation)
    rerender({ serverIsRunning: true });

    // Fast-forward past the timeout
    act(() => {
        jest.advanceTimersByTime(1500);
    });

    // The state should remain true because the action was confirmed
    expect(result.current.isRunning).toBe(true);
  });
})
