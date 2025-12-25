/** @jest-environment jsdom */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSession } from 'next-auth/react'

jest.mock('@/context/WebSocketContext')
jest.mock('next-auth/react')

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock

const wrapper = ({ children }: { children: React.ReactNode }) => children

describe('useSpotifyDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseWebSocket.mockReturnValue({
      spotifyData: { trackName: 'test track', accessToken: 'mock-token' },
      sendData: jest.fn(),
    })
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            devices: [{ id: '1', name: 'Device 1', is_active: true }],
          }),
      })
    ) as jest.Mock
  })

  it('should not fetch devices if not authenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated', data: null, update: jest.fn() })
    renderHook(() => useSpotifyDevices(), { wrapper })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should fetch devices when authenticated', async () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated', data: { user: {} }, update: jest.fn() })
    const { result } = renderHook(() => useSpotifyDevices(), { wrapper })

    await waitFor(() => {
      expect(result.current.devices).toHaveLength(1)
    })

    expect(result.current.selectedDeviceId).toBe('1')
  })

  it('should handle fetch error', async () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated', data: { user: {} }, update: jest.fn() })
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error'))) as jest.Mock
    const { result } = renderHook(() => useSpotifyDevices(), { wrapper })

    await waitFor(() => {
        expect(result.current.error).toBe('API Error')
    })
  })

  it('should send TRANSFER_PLAYBACK command on device selection', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated', data: { user: {} }, update: jest.fn() })
    const sendData = jest.fn()
    mockedUseWebSocket.mockReturnValue({
        spotifyData: { trackName: 'test track', accessToken: 'mock-token' },
        sendData,
    })
    const { result } = renderHook(() => useSpotifyDevices(), { wrapper })
    act(() => {
      result.current.handleDeviceSelected('2')
    })
    expect(sendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId: '2',
    })
    expect(result.current.selectedDeviceId).toBe('2')
  })
})
