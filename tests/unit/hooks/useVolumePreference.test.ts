/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useVolumePreference from '@/hooks/useVolumePreference'
import { STORAGE_KEY_VOL, STORAGE_KEY_MUTE } from '@/constants/storageKeys'

describe('useVolumePreference', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with default volume', () => {
    const { result } = renderHook(() => useVolumePreference(80))
    expect(result.current.volume).toBe(80)
    expect(result.current.muted).toBe(false)
  })

  it('should load preferences from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_VOL, '50')
    localStorage.setItem(STORAGE_KEY_MUTE, 'true')

    const { result } = renderHook(() => useVolumePreference())

    expect(result.current.volume).toBe(0) // Muted
    expect(result.current.muted).toBe(true)
  })

  it('should set volume and persist after debounce', () => {
    const { result } = renderHook(() => useVolumePreference())

    act(() => {
      result.current.setVolume(60)
    })

    expect(result.current.volume).toBe(60)
    // Should not persist immediately
    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBeNull()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Now it should be persisted
    expect(localStorage.getItem(STORAGE_KEY_VOL)).toBe('60')
  })

  it('should toggle mute', () => {
    const { result } = renderHook(() => useVolumePreference(70))

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.muted).toBe(true)
    expect(result.current.volume).toBe(0)
    expect(localStorage.getItem(STORAGE_KEY_MUTE)).toBe('true')

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.muted).toBe(false)
    expect(result.current.volume).toBe(70)
    expect(localStorage.getItem(STORAGE_KEY_MUTE)).toBe('false')
  })
})
