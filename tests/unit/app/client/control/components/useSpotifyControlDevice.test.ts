/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyControlDevice } from '@/app/client/control/components/useSpotifyControlDevice'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import { createMockSpotifyDevice } from '@/tests/test-utils'

describe('useSpotifyControlDevice', () => {
  const baseProps = {
    connectionStatus: 'Connected',
    spotifyServiceInitialized: true,
    sendData: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requests devices when connected and initialized', () => {
    const sendData = jest.fn()
    renderHook(() =>
      useSpotifyControlDevice({ ...baseProps, sendData, devices: [] })
    )
    expect(sendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'GET_DEVICES',
    })
  })

  it('does not request devices when disconnected', () => {
    const sendData = jest.fn()
    renderHook(() =>
      useSpotifyControlDevice({
        ...baseProps,
        sendData,
        devices: [],
        connectionStatus: 'Disconnected',
      })
    )
    expect(sendData).not.toHaveBeenCalled()
  })

  it('auto-selects the Spotify-active device', () => {
    const devices = [
      createMockSpotifyDevice({ id: 'a', name: 'A', is_active: false }),
      createMockSpotifyDevice({ id: 'b', name: 'B', is_active: true }),
    ]
    const { result } = renderHook(() =>
      useSpotifyControlDevice({ ...baseProps, sendData: jest.fn(), devices })
    )
    expect(result.current.selectedDeviceId).toBe('b')
  })

  it('falls back to the HRM web player when nothing is active', () => {
    const devices = [
      createMockSpotifyDevice({ id: 'a', name: 'A', is_active: false }),
      createMockSpotifyDevice({
        id: 'hrm',
        name: HRM_WEB_PLAYER_NAME,
        is_active: false,
      }),
    ]
    const { result } = renderHook(() =>
      useSpotifyControlDevice({ ...baseProps, sendData: jest.fn(), devices })
    )
    expect(result.current.selectedDeviceId).toBe('hrm')
  })

  it('tolerates devices with null names (#9298)', () => {
    const devices = [
      createMockSpotifyDevice({ id: 'a', name: null, is_active: true }),
    ]
    let result!: { current: ReturnType<typeof useSpotifyControlDevice> }
    expect(() => {
      const rendered = renderHook(() =>
        useSpotifyControlDevice({ ...baseProps, sendData: jest.fn(), devices })
      )
      result = rendered.result
    }).not.toThrow()
    expect(result.current.selectedDeviceId).toBe('a')
    expect(result.current.resolveTargetDeviceId()).toBe('a')
  })

  it('selectDevice overrides the selection', () => {
    const devices = [
      createMockSpotifyDevice({ id: 'a', name: 'A', is_active: true }),
      createMockSpotifyDevice({ id: 'b', name: 'B', is_active: false }),
    ]
    const { result } = renderHook(() =>
      useSpotifyControlDevice({ ...baseProps, sendData: jest.fn(), devices })
    )
    act(() => {
      result.current.selectDevice('b')
    })
    expect(result.current.selectedDeviceId).toBe('b')
    expect(result.current.resolveTargetDeviceId()).toBe('b')
  })
})
