/** @jest-environment jsdom */

import { renderHook, act } from '@testing-library/react'
import useSpotifyControls from '@/hooks/useSpotifyControls'
import { useWebSocket } from '@/context/WebSocketContext'
import useVolumePreference from '@/hooks/useVolumePreference'
import { Device } from '@spotify/web-api-ts-sdk'

// Mock dependencies
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useVolumePreference')

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseVolumePreference = useVolumePreference as jest.Mock

describe('useSpotifyControls', () => {
  let mockSendData: jest.Mock
  let mockSetVolume: jest.Mock
  let mockToggleMute: jest.Mock

  beforeEach(() => {
    mockSendData = jest.fn()
    mockSetVolume = jest.fn()
    mockToggleMute = jest.fn()

    mockedUseWebSocket.mockReturnValue({
      spotifyData: { devices: [] },
      connectionStatus: 'Connected',
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    mockedUseVolumePreference.mockReturnValue({
      volume: 70,
      setVolume: mockSetVolume,
      muted: false,
      toggleMute: mockToggleMute,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should request devices on mount when connected', () => {
    renderHook(() => useSpotifyControls())
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'GET_DEVICES',
    })
  })

  it('should select the active device on initial load', () => {
    const devices = [
      { id: '1', name: 'Device 1', is_active: false },
      { id: '2', name: 'Device 2', is_active: true },
    ] as Device[]
    mockedUseWebSocket.mockReturnValue({
      spotifyData: { devices },
      connectionStatus: 'Connected',
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    const { result } = renderHook(() => useSpotifyControls())
    expect(result.current.selectedDeviceId).toBe('2')
  })

  it('should update the selected device when the active device changes', () => {
    const initialDevices = [
      { id: '1', name: 'Device 1', is_active: true },
    ] as Device[]
    const updatedDevices = [
      { id: '1', name: 'Device 1', is_active: false },
      { id: '2', name: 'Device 2', is_active: true },
    ] as Device[]

    mockedUseWebSocket.mockReturnValue({
      spotifyData: { devices: initialDevices },
      connectionStatus: 'Connected',
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    const { result, rerender } = renderHook(() => useSpotifyControls())
    expect(result.current.selectedDeviceId).toBe('1')

    mockedUseWebSocket.mockReturnValue({
      spotifyData: { devices: updatedDevices },
      connectionStatus: 'Connected',
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    rerender()
    expect(result.current.selectedDeviceId).toBe('2')
  })

  it('should send a PLAY command with the selected device', () => {
    const { result } = renderHook(() => useSpotifyControls())
    act(() => {
      result.current.setSelectedDeviceId('123')
    })
    act(() => {
      result.current.handlePlaybackCommand('PLAY')
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: '123',
    })
  })

  it('should send a SET_VOLUME command with the correct volume', () => {
    jest.useFakeTimers()
    const { result, rerender } = renderHook(() => useSpotifyControls())

    act(() => {
      result.current.setSelectedDeviceId('123')
    })

    act(() => {
      result.current.setVolume(70)
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    mockedUseVolumePreference.mockReturnValue({
      volume: 50,
      setVolume: mockSetVolume,
      muted: false,
      toggleMute: mockToggleMute,
    })

    rerender()

    act(() => {
      result.current.setVolume(50)
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'SET_VOLUME',
        volume: 50,
      })
    )
    jest.useRealTimers()
  })
})
