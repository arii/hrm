/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyControlVolume } from '@/app/client/control/components/useSpotifyControlVolume'
import useVolumePreference from '@/hooks/useVolumePreference'
import { createMockSpotifyDevice } from '@/tests/test-utils'

jest.mock('@/hooks/useVolumePreference', () => {
  const originalModule = jest.requireActual('@/hooks/useVolumePreference')
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn(),
  }
})

describe('useSpotifyControlVolume', () => {
  const mockSetVolume = jest.fn()
  const mockToggle = jest.fn()
  const activeDevices = [
    createMockSpotifyDevice({ id: 'a', name: 'A', is_active: true }),
  ]

  const baseProps = {
    devices: activeDevices,
    playbackVolume: 50,
    connectionStatus: 'Connected',
    showWarning: jest.fn(),
    resolveTargetDeviceId: () => 'a' as string | undefined,
    executeSpotify: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useVolumePreference as jest.Mock).mockReturnValue({
      volume: 50,
      muted: false,
      setVolume: mockSetVolume,
      toggleMuteAndPersist: mockToggle,
    })
  })

  it('syncs server volume when it drifts', () => {
    renderHook(() =>
      useSpotifyControlVolume({ ...baseProps, playbackVolume: 70 })
    )
    expect(mockSetVolume).toHaveBeenCalledWith(70)
  })

  it('does not sync while sliding', () => {
    const { result } = renderHook(() =>
      useSpotifyControlVolume({ ...baseProps, playbackVolume: 70 })
    )
    mockSetVolume.mockClear()
    act(() => {
      result.current.handleVolumeChange(30)
    })
    // Sliding update only; no server resync while the gesture is active.
    expect(mockSetVolume).toHaveBeenCalledTimes(1)
    expect(mockSetVolume).toHaveBeenCalledWith(30)
  })

  it('sends SET_VOLUME on commit with dedup', () => {
    const executeSpotify = jest.fn()
    const { result } = renderHook(() =>
      useSpotifyControlVolume({ ...baseProps, executeSpotify })
    )
    act(() => {
      result.current.handleVolumeChangeCommitted(60)
    })
    act(() => {
      result.current.handleVolumeChangeCommitted(60)
    })
    expect(executeSpotify).toHaveBeenCalledTimes(1)
    expect(executeSpotify).toHaveBeenCalledWith('SET_VOLUME', {
      volume: 60,
      deviceId: 'a',
    })
  })

  it('warns (throttled) when sliding offline', () => {
    const showWarning = jest.fn()
    const { result } = renderHook(() =>
      useSpotifyControlVolume({
        ...baseProps,
        showWarning,
        connectionStatus: 'Disconnected',
      })
    )
    act(() => {
      result.current.handleVolumeChange(10)
      result.current.handleVolumeChange(11)
    })
    expect(showWarning).toHaveBeenCalledTimes(1)
    expect(showWarning).toHaveBeenCalledWith('Changes not saved: Offline')
  })
})
