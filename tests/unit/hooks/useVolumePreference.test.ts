/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react'
import useVolumePreference from '@/hooks/useVolumePreference'

// Mock the audioManager
jest.mock('@/utils/audioManager', () => ({
  audioManager: {
    setVolume: jest.fn(),
    setMuted: jest.fn(),
  },
}))

describe('hooks/useVolumePreference', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with default volume and unmuted state', () => {
    const { result } = renderHook(() => useVolumePreference(50))
    expect(result.current.volume).toBe(50)
    expect(result.current.muted).toBe(false)
  })

  it('should load preferences from localStorage', () => {
    localStorage.setItem('hrm-preferred-volume', '30')
    localStorage.setItem('hrm-muted', 'true')
    const { result } = renderHook(() => useVolumePreference(50))
    expect(result.current.volume).toBe(0) // Muted, so volume is 0
    expect(result.current.muted).toBe(true)
  })

  it('should set volume and unmute if volume > 0', () => {
    const { result } = renderHook(() => useVolumePreference(50))

    act(() => {
      result.current.setVolume(75)
    })

    expect(result.current.volume).toBe(75)
    expect(result.current.muted).toBe(false)
    expect(localStorage.getItem('hrm-muted')).toBe('false')

    // Should not persist volume immediately
    expect(localStorage.getItem('hrm-preferred-volume')).toBeNull()

    act(() => {
      jest.advanceTimersByTime(500)
    })
    // Should persist volume after debounce
    expect(localStorage.getItem('hrm-preferred-volume')).toBe('75')
  })

  it('should mute if volume is set to 0', () => {
    const { result } = renderHook(() => useVolumePreference(50))
    act(() => {
      result.current.setVolume(0)
    })
    expect(result.current.volume).toBe(0)
    expect(result.current.muted).toBe(true)
    expect(localStorage.getItem('hrm-muted')).toBe('true')
  })

  it('should toggle mute state and restore previous volume', () => {
    const { result } = renderHook(() => useVolumePreference(80))

    // Mute
    act(() => {
      result.current.toggleMute()
    })
    expect(result.current.volume).toBe(0)
    expect(result.current.muted).toBe(true)
    expect(localStorage.getItem('hrm-muted')).toBe('true')

    // Unmute
    act(() => {
      result.current.toggleMute()
    })
    expect(result.current.volume).toBe(80)
    expect(result.current.muted).toBe(false)
    expect(localStorage.getItem('hrm-muted')).toBe('false')
  })
})
