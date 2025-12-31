/** @jest-environment jsdom */
// tests/unit/hooks/useSpotifyDisplay.test.ts
import { renderHook, act } from '@testing-library/react'
import { useSpotifyDisplay } from '@/hooks/useSpotifyDisplay'
import { SpotifyData } from '@/types/websocket'
import { Session } from 'next-auth'

// Mock the useError hook
jest.mock('@/context/ErrorContext', () => ({
  useError: () => ({
    addError: jest.fn(),
  }),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

const mockSendData = jest.fn()

const initialSpotifyData: SpotifyData = {
  trackName: 'Test Track',
  artist: 'Test Artist',
  albumArt: '',
  isPlaying: false,
  durationMs: 100000,
  progressMs: 0,
  volume: 50,
  isMuted: false,
  devices: [{ id: '1', name: 'Device 1', is_active: true }],
}

const initialProps = {
  spotifyData: initialSpotifyData,
  sendData: mockSendData,
  connectionStatus: 'Connected' as const,
  session: {} as Session,
}

describe('useSpotifyDisplay', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSendData.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSpotifyDisplay(initialProps))

    expect(result.current.state.displayVolume).toBe(50)
    expect(result.current.state.isMuted).toBe(false)
  })

  it('should handle volume change and debounce the command', () => {
    const { result } = renderHook(() => useSpotifyDisplay(initialProps))

    act(() => {
      result.current.handlers.handleVolumeChange(80)
    })

    expect(result.current.state.displayVolume).toBe(80)
    expect(mockSendData).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      volume: 80,
      deviceId: '1',
    })
  })

  it('should handle toggling mute', () => {
    const { result } = renderHook(() => useSpotifyDisplay(initialProps))

    act(() => {
      result.current.handlers.handleToggleMute()
    })

    expect(result.current.state.isMuted).toBe(true)
    expect(result.current.state.displayVolume).toBe(0)
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      volume: 0,
      deviceId: '1',
    })

    act(() => {
      result.current.handlers.handleToggleMute()
    })

    expect(result.current.state.isMuted).toBe(false)
    expect(result.current.state.displayVolume).toBe(50)
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      volume: 50,
      deviceId: '1',
    })
  })

  it('should handle play/pause toggle', () => {
    const { result, rerender } = renderHook(
      (props) => useSpotifyDisplay(props),
      {
        initialProps,
      }
    )

    act(() => {
      result.current.handlers.handlePlayPauseToggle()
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
    })

    rerender({
      ...initialProps,
      spotifyData: { ...initialSpotifyData, isPlaying: true },
    })

    act(() => {
      result.current.handlers.handlePlayPauseToggle()
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PAUSE',
    })
  })

  it('should handle device selection', () => {
    const { result } = renderHook(() => useSpotifyDisplay(initialProps))

    act(() => {
      result.current.handlers.handleDeviceSelect('2')
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId: '2',
    })
  })

  it('should send previous and next commands', () => {
    const { result } = renderHook(() => useSpotifyDisplay(initialProps))

    act(() => {
      result.current.handlers.sendSpotifyCommand('PREVIOUS')
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PREVIOUS',
    })

    act(() => {
      result.current.handlers.sendSpotifyCommand('NEXT')
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'NEXT',
    })
  })
})
