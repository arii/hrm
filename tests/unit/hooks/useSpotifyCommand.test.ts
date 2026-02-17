/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useWebSocket } from '@/context/WebSocketContext'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'

// Mock useWebSocket
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

describe('useSpotifyCommand', () => {
  const mockSendData = jest.fn()

  const defaultSpotifyData = {
    devices: [],
    playback: {
      track: {},
      is_playing: false,
      volume_percent: 50,
    },
  }

  // Helper to setup mock state
  const mockSpotifyState = (devices: unknown[] = []) => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      spotifyData: { ...defaultSpotifyData, devices },
      sendData: mockSendData,
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSpotifyState()
  })

  it('sends PLAY command with deviceId from payload (highest priority)', () => {
    const { result } = renderHook(() => useSpotifyCommand())

    act(() => {
      result.current.execute('PLAY', {
        deviceId: 'payload-device',
        uri: 'spotify:track:test',
      })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: 'payload-device',
      uri: 'spotify:track:test',
    })
  })

  it('sends PLAY command using active device if no payload deviceId', () => {
    mockSpotifyState([
      { id: 'active-device', name: 'Speaker', is_active: true },
      { id: 'other-device', name: 'Phone', is_active: false },
    ])

    const { result } = renderHook(() => useSpotifyCommand())

    act(() => {
      result.current.execute('PLAY', { uri: 'spotify:track:test' })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: 'active-device',
      uri: 'spotify:track:test',
    })
  })

  it('sends PLAY command using HRM Web Player if no active device', () => {
    mockSpotifyState([
      { id: 'hrm-device', name: HRM_WEB_PLAYER_NAME, is_active: false },
      { id: 'other-device', name: 'Phone', is_active: false },
    ])

    const { result } = renderHook(() => useSpotifyCommand())

    act(() => {
      result.current.execute('PLAY', { uri: 'spotify:track:test' })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: 'hrm-device',
      uri: 'spotify:track:test',
    })
  })

  it('sends PLAY command with undefined deviceId if no devices available', () => {
    const { result } = renderHook(() => useSpotifyCommand())

    act(() => {
      result.current.execute('PLAY', { uri: 'spotify:track:test' })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: undefined,
      uri: 'spotify:track:test',
    })
  })

  it('sends SET_VOLUME command correctly', () => {
    const { result } = renderHook(() => useSpotifyCommand())

    act(() => {
      result.current.execute('SET_VOLUME', {
        volume: 75,
        deviceId: 'target-device',
      })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      deviceId: 'target-device',
      volume: 75,
    })
  })

  it('sends TRANSFER_PLAYBACK command correctly', () => {
    const { result } = renderHook(() => useSpotifyCommand())

    act(() => {
      result.current.execute('TRANSFER_PLAYBACK', { deviceId: 'new-device' })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId: 'new-device',
    })
  })
})
