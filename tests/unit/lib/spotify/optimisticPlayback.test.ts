/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import {
  OPTIMISTIC_REVERT_MS,
  setOptimisticPlaying,
  useSyncedPlaying,
} from '@/lib/spotify/optimisticPlayback'

describe('optimisticPlayback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setOptimisticPlaying(null)
  })

  afterEach(() => {
    jest.useRealTimers()
    setOptimisticPlaying(null)
  })

  it('returns the server value when no optimistic value is set', () => {
    const { result, rerender } = renderHook(
      ({ server }) => useSyncedPlaying(server),
      { initialProps: { server: false } }
    )
    expect(result.current).toBe(false)
    rerender({ server: true })
    expect(result.current).toBe(true)
  })

  it('shares one optimistic value across hook instances', () => {
    const first = renderHook(() => useSyncedPlaying(false))
    const second = renderHook(() => useSyncedPlaying(false))

    act(() => {
      setOptimisticPlaying(true)
    })

    expect(first.result.current).toBe(true)
    expect(second.result.current).toBe(true)
  })

  it('reverts to the server value after the grace window', () => {
    const { result } = renderHook(() => useSyncedPlaying(false))

    act(() => {
      setOptimisticPlaying(true)
    })
    expect(result.current).toBe(true)

    act(() => {
      jest.advanceTimersByTime(OPTIMISTIC_REVERT_MS + 100)
    })
    expect(result.current).toBe(false)
  })

  it('keeps Pause while a lagging server still reports playing', () => {
    const { result, rerender } = renderHook(
      ({ server }) => useSyncedPlaying(server),
      { initialProps: { server: true } }
    )

    act(() => {
      setOptimisticPlaying(false)
    })
    act(() => {
      jest.advanceTimersByTime(6000)
    })
    rerender({ server: true })
    expect(result.current).toBe(false)

    rerender({ server: false })
    expect(result.current).toBe(false)
  })

  it('clears early once the server catches up', () => {
    const { result, rerender } = renderHook(
      ({ server }) => useSyncedPlaying(server),
      { initialProps: { server: false } }
    )

    act(() => {
      setOptimisticPlaying(true)
    })
    expect(result.current).toBe(true)

    rerender({ server: true })
    expect(result.current).toBe(true)

    // Optimistic cleared: a later server flip renders immediately.
    rerender({ server: false })
    expect(result.current).toBe(false)
  })
})
