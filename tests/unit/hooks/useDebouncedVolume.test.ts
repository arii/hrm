/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import useDebouncedVolume from '@/hooks/useDebouncedVolume'
import { STORAGE_KEY_VOL } from '@/constants/storageKeys'

describe('useDebouncedVolume', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not persist volume on initial render', () => {
    renderHook(() => useDebouncedVolume(50, false))
    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBeNull()
  })

  it('should persist volume after debounce delay', () => {
    const { rerender } = renderHook(
      ({ volume, isLoaded }) => useDebouncedVolume(volume, isLoaded),
      {
        initialProps: { volume: 50, isLoaded: true },
      }
    )

    rerender({ volume: 75, isLoaded: true })

    // Should not persist immediately
    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBeNull()

    // Fast-forward time
    jest.advanceTimersByTime(500)

    // Now it should be persisted
    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBe('75')
  })

  it('should not persist volume if it is 0', () => {
    renderHook(() => useDebouncedVolume(0, true))

    jest.advanceTimersByTime(500)

    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBeNull()
  })

  it('should clear timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebouncedVolume(80, true))

    unmount()

    jest.advanceTimersByTime(500)

    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBeNull()
  })
})
