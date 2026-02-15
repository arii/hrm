/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useWebSocket, WebSocketContextType } from '@/context/WebSocketContext'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import { jest } from '@jest/globals'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>

describe('useSpotifyCommand', () => {
  let sendDataMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    sendDataMock = jest.fn()

    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        devices: [],
        playback: {
          track: {
            id: 't1',
            name: 'Song',
            artist: 'Artist',
            albumName: 'Album',
            albumArtUrl: 'url',
          },
          is_playing: true,
          volume_percent: 50,
        },
      },
      sendData: sendDataMock,
      connectionStatus: 'Connected',
      connect: jest.fn(),
      disconnect: jest.fn(),
      hrmData: [],
      activeAlerts: [],
      spotifyServiceInitialized: true,
    } as unknown as WebSocketContextType)
  })

  it('should send a command using the active device', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        devices: [
          { id: 'd1', name: 'Device 1', is_active: true, volume_percent: 50 },
          {
            id: 'd2',
            name: HRM_WEB_PLAYER_NAME,
            is_active: false,
            volume_percent: 50,
          },
        ],
      },
      sendData: sendDataMock,
    } as unknown as WebSocketContextType)

    const { result } = renderHook(() => useSpotifyCommand())
    act(() => {
      result.current.execute('PLAY')
    })

    expect(sendDataMock).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: 'd1',
    })
  })

  it('should fallback to HRM Web Player if no device is active', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        devices: [
          { id: 'd1', name: 'Device 1', is_active: false, volume_percent: 50 },
          {
            id: 'd2',
            name: HRM_WEB_PLAYER_NAME,
            is_active: false,
            volume_percent: 50,
          },
        ],
      },
      sendData: sendDataMock,
    } as unknown as WebSocketContextType)

    const { result } = renderHook(() => useSpotifyCommand())
    act(() => {
      result.current.execute('PAUSE')
    })

    expect(sendDataMock).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PAUSE',
      deviceId: 'd2',
    })
  })

  it('should allow overriding deviceId in payload', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        devices: [
          { id: 'd1', name: 'Device 1', is_active: true, volume_percent: 50 },
        ],
      },
      sendData: sendDataMock,
    } as unknown as WebSocketContextType)

    const { result } = renderHook(() => useSpotifyCommand())
    act(() => {
      result.current.execute('TRANSFER_PLAYBACK', { deviceId: 'd3' })
    })

    expect(sendDataMock).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId: 'd3',
    })
  })

  it('should include other payload fields', () => {
    const { result } = renderHook(() => useSpotifyCommand())
    act(() => {
      result.current.execute('SET_VOLUME', { volume: 80 })
    })

    expect(sendDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'SET_VOLUME',
        volume: 80,
      })
    )
  })

  it('should return correct status flags', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        devices: [
          {
            id: 'd1',
            name: HRM_WEB_PLAYER_NAME,
            is_active: true,
            volume_percent: 50,
          },
        ],
        playback: { is_playing: true },
      },
      sendData: sendDataMock,
    } as unknown as WebSocketContextType)

    const { result } = renderHook(() => useSpotifyCommand())

    expect(result.current.isHrmPlayerActive).toBe(true)
    expect(result.current.activeDevice?.id).toBe('d1')
  })

  it('should return playback state', () => {
    const { result } = renderHook(() => useSpotifyCommand())
    expect(result.current.playback.track.name).toBe('Song')
    expect(result.current.playback.is_playing).toBe(true)
  })
})
