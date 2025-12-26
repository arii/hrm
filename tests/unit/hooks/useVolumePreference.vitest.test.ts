import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import useVolumePreference from '../../../hooks/useVolumePreference'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useVolumePreference', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should initialize with default volume', () => {
    const { result } = renderHook(() => useVolumePreference(80))
    expect(result.current.volume).toBe(80)
    expect(result.current.muted).toBe(false)
  })

  it('should load volume from localStorage', () => {
    localStorageMock.setItem('hrm-preferred-volume', '50')
    const { result } = renderHook(() => useVolumePreference(80))
    expect(result.current.volume).toBe(50)
  })

  it('should load mute state from localStorage', () => {
    localStorageMock.setItem('hrm-muted', 'true')
    localStorageMock.setItem('hrm-preferred-volume', '60')
    const { result } = renderHook(() => useVolumePreference(80))
    expect(result.current.muted).toBe(true)
    expect(result.current.volume).toBe(0)
  })

  it('should set volume', () => {
    const { result } = renderHook(() => useVolumePreference())
    act(() => {
      result.current.setVolume(40)
    })
    expect(result.current.volume).toBe(40)
  })

  it('should mute when volume is set to 0', () => {
    const { result } = renderHook(() => useVolumePreference())
    act(() => {
      result.current.setVolume(0)
    })
    expect(result.current.muted).toBe(true)
  })

  it('should unmute when volume is set above 0', () => {
    const { result } = renderHook(() => useVolumePreference())
    act(() => {
      result.current.setVolume(0)
    })
    act(() => {
      result.current.setVolume(50)
    })
    expect(result.current.muted).toBe(false)
  })

  it('should toggle mute', () => {
    const { result } = renderHook(() => useVolumePreference(70))
    act(() => {
      result.current.toggleMute()
    })
    expect(result.current.muted).toBe(true)
    expect(result.current.volume).toBe(0)
  })

  it('should restore previous volume when unmuting', () => {
    const { result } = renderHook(() => useVolumePreference(70))
    act(() => {
      result.current.setVolume(60)
    })
    act(() => {
      result.current.toggleMute() // Mute
    })
    act(() => {
      result.current.toggleMute() // Unmute
    })
    expect(result.current.volume).toBe(60)
  })
})
