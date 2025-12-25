/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyControl } from '@/hooks/useSpotifyControl'
import { WebSocketContext } from '@/context/WebSocketContext'
import { SpotifyData, SpotifyDevice } from '@/types'
import { ReactNode } from 'react'

const mockSendData = jest.fn()

const mockSpotifyData: SpotifyData = {
  isPlaying: false,
  trackName: 'Test Track',
  artist: 'Test Artist',
  albumArt: null,
  devices: [
    { id: '1', name: 'Device 1', is_active: true },
    { id: '2', name: 'Device 2', is_active: false },
  ],
  durationMs: 180000,
  progressMs: 60000,
  volumePercent: 50,
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <WebSocketContext.Provider
    value={{
      isConnected: true,
      spotifyData: mockSpotifyData,
      timerData: {} as any,
      hrmData: [],
      sendData: mockSendData,
      lastMessage: null,
      workoutHistory: [],
    }}
  >
    {children}
  </WebSocketContext.Provider>
)

describe('useSpotifyControl', () => {
  beforeEach(() => {
    mockSendData.mockClear()
  })

  it('should initialize with devices from WebSocket context', () => {
    const { result } = renderHook(() => useSpotifyControl(), { wrapper })
    expect(result.current.availableDevices).toEqual(mockSpotifyData.devices)
    expect(result.current.selectedDeviceId).toBe('1') // Active device
  })

  it('should send a command via WebSocket', async () => {
    const { result } = renderHook(() => useSpotifyControl(), { wrapper })
    await act(async () => {
      await result.current.sendCommand('PLAY', { playlistUri: 'test_uri' })
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: '1',
      playlistUri: 'test_uri',
    })
    expect(result.current.loading['PLAY']).toBe(false)
    expect(result.current.success).toContain('PLAY command sent successfully')
  })

  it('should handle device selection and transfer playback', async () => {
    const { result } = renderHook(() => useSpotifyControl(), { wrapper })
    await act(async () => {
      result.current.setSelectedDeviceId('2')
    })

    expect(result.current.selectedDeviceId).toBe('2')
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId: '2',
    })
    expect(result.current.success).toBe('Playback transferred successfully.')
  })

  it('should handle errors when sending commands', async () => {
    mockSendData.mockRejectedValue(new Error('WebSocket error'))
    const { result } = renderHook(() => useSpotifyControl(), { wrapper })

    await act(async () => {
      await result.current.sendCommand('PAUSE')
    })

    expect(result.current.loading['PAUSE']).toBe(false)
    expect(result.current.error).toContain(
      'Failed to send PAUSE command: WebSocket error'
    )
  })
})
