/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useTimerVolume from '@/hooks/useTimerVolume'
import { audioManager } from '@/utils/audioManager'

// Mock audioManager
jest.mock('@/utils/audioManager', () => ({
  audioManager: {
    setVolume: jest.fn(),
    setMuted: jest.fn(),
    toggleMute: jest.fn(),
    getMuted: jest.fn(),
  },
}))

describe('useTimerVolume', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTimerVolume())
    expect(result.current.volume).toBe(70)
  })

  it('should load values from localStorage if they exist', () => {
    localStorage.setItem('timerVolume', JSON.stringify(50))
    const { result } = renderHook(() => useTimerVolume())
    expect(result.current.volume).toBe(50)
  })

  it('should update volume and persist to localStorage', () => {
    const { result } = renderHook(() => useTimerVolume())

    act(() => {
      result.current.handleVolumeChange(30)
    })

    expect(result.current.volume).toBe(30)
    expect(localStorage.getItem('timerVolume')).toBe('30')
    expect(audioManager.setVolume).toHaveBeenCalledWith(30)
  })

  it('should toggle mute and persist to localStorage', () => {
    ;(audioManager.toggleMute as jest.Mock).mockReturnValue(true)
    const { result } = renderHook(() => useTimerVolume())

    act(() => {
      result.current.handleToggleMute()
    })

    expect(result.current.muted).toBe(true)
    expect(localStorage.getItem('timerMuted')).toBe('true')
  })
})
