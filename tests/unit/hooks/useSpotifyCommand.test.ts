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

  describe('Device ID Resolution Logic', () => {
    it('Priority 1: Payload deviceId overrides everything', () => {
      mockedUseWebSocket.mockReturnValue({
        spotifyData: {
          devices: [
            {
              id: 'active-device',
              name: 'Active Speaker',
              is_active: true,
              volume_percent: 50,
            },
            {
              id: 'hrm-device',
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
        // Even with an active device and HRM player available, payload ID 'target-device' should be used
        result.current.execute('PLAY', { deviceId: 'target-device' })
      })

      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'PLAY',
          deviceId: 'target-device',
        })
      )
    })

    it('Priority 2: Active Device is used if no payload deviceId', () => {
      mockedUseWebSocket.mockReturnValue({
        spotifyData: {
          devices: [
            {
              id: 'active-device',
              name: 'Active Speaker',
              is_active: true,
              volume_percent: 50,
            },
            {
              id: 'hrm-device',
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
        // No payload deviceId -> should use 'active-device'
        result.current.execute('PAUSE')
      })

      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'PAUSE',
          deviceId: 'active-device',
        })
      )
    })

    it('Priority 3: HRM Web Player is used if no payload deviceId and no active device', () => {
      mockedUseWebSocket.mockReturnValue({
        spotifyData: {
          devices: [
            {
              id: 'inactive-speaker',
              name: 'Inactive Speaker',
              is_active: false,
              volume_percent: 50,
            },
            {
              id: 'hrm-device',
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
        // No payload, no active device -> should fallback to 'hrm-device'
        result.current.execute('NEXT')
      })

      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'NEXT',
          deviceId: 'hrm-device',
        })
      )
    })

    it('Priority 4: Returns undefined if no devices available', () => {
      mockedUseWebSocket.mockReturnValue({
        spotifyData: {
          devices: [], // No devices at all
        },
        sendData: sendDataMock,
      } as unknown as WebSocketContextType)

      const { result } = renderHook(() => useSpotifyCommand())

      act(() => {
        result.current.execute('PREVIOUS')
      })

      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'PREVIOUS',
          deviceId: undefined,
        })
      )
    })
  })

  describe('Payload Handling', () => {
    it('Merges payload properties with command', () => {
      const { result } = renderHook(() => useSpotifyCommand())

      act(() => {
        result.current.execute('PLAY', {
          contextUri: 'spotify:album:123',
          offset: { position: 5 },
        })
      })

      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'PLAY',
          contextUri: 'spotify:album:123',
          offset: { position: 5 },
        })
      )
    })

    it('Ensures deviceId property exists in message even if resolved to undefined', () => {
      mockedUseWebSocket.mockReturnValue({
        spotifyData: { devices: [] },
        sendData: sendDataMock,
      } as unknown as WebSocketContextType)

      const { result } = renderHook(() => useSpotifyCommand())

      act(() => {
        result.current.execute('PLAY')
      })

      // The resolvedDeviceId will be undefined, but the property should be present
      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'PLAY',
          deviceId: undefined,
        })
      )
    })
  })

  // Keep existing tests for backward compatibility / broader coverage check
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
})
