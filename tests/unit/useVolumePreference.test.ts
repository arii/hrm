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

  it('should toggle mute state and adjust volume', () => {
    const { result } = renderHook(() => useVolumePreference(70))
    act(() => {
      result.current.toggleMute()
    })
    expect(result.current.muted).toBe(true)
    expect(result.current.volume).toBe(0)
    act(() => {
      result.current.toggleMute()
    })
    expect(result.current.muted).toBe(false)
    expect(result.current.volume).toBe(70)
  })

  it('should set volume and unmute if volume > 0', () => {
    const { result } = renderHook(() => useVolumePreference(70))
    act(() => {
      result.current.toggleMute()
    })
    expect(result.current.muted).toBe(true)
    act(() => {
      result.current.setVolume(50)
    })
    expect(result.current.muted).toBe(false)
    expect(result.current.volume).toBe(50)
  })

  it('should mute if volume is set to 0', () => {
    const { result } = renderHook(() => useVolumePreference(70))
    act(() => {
      result.current.setVolume(0)
    })
    expect(result.current.muted).toBe(true)
    expect(result.current.volume).toBe(0)
  })
})
