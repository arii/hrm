// hooks/useSpotifyControls.test.ts
import { renderHook } from '@testing-library/react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyControls } from './useSpotifyControls'
import { resolveSpotifyDeviceId } from '@/lib/spotify/device'

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

jest.mock('@/lib/spotify/device', () => ({
  resolveSpotifyDeviceId: jest.fn(),
}))

describe('useSpotifyControls', () => {
  const mockSendData = jest.fn()
  const mockUseWebSocket = useWebSocket as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      spotifyData: { devices: [] },
    })
  })

  it('should send a PAUSE command without a device ID when no devices are available', () => {
    ;(resolveSpotifyDeviceId as jest.Mock).mockReturnValue('')
    const { result } = renderHook(() => useSpotifyControls())
    result.current.sendSpotifyCommand('PAUSE')

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PAUSE',
    })
  })

  it('should send a NEXT command with a device ID when a device is available', () => {
    const mockDeviceId = 'test-device-id'
    ;(resolveSpotifyDeviceId as jest.Mock).mockReturnValue(mockDeviceId)
    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      spotifyData: { devices: [{ id: mockDeviceId, is_active: true, name: 'Test Device' }] },
    })
    const { result } = renderHook(() => useSpotifyControls())
    result.current.sendSpotifyCommand('NEXT')

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'NEXT',
      deviceId: mockDeviceId,
    })
  })
})
