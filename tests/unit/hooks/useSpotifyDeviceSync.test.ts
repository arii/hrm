import { renderHook, act } from '@testing-library/react'
import { useSpotifyDeviceSync } from '@/hooks/useSpotifyDeviceSync'
import { SpotifyData } from '@/types/websocket'

describe('useSpotifyDeviceSync', () => {
  const mockExecuteSpotify = jest.fn()
  const defaultSpotifyData: SpotifyData = {
    devices: [],
    playback: {
      track: {
        id: 't1',
        name: 'Track',
        artist: 'Artist',
        albumName: 'Album',
        albumArtUrl: '',
      },
      is_playing: false,
      volume_percent: 50,
      isMuted: false,
      progress_ms: 0,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('initializes state from spotifyData', () => {
    const { result } = renderHook(() =>
      useSpotifyDeviceSync(defaultSpotifyData, mockExecuteSpotify, 'Connected')
    )

    expect(result.current.displayVolume).toBe(50)
    expect(result.current.isMuted).toBe(false)
  })

  it('updates state when spotifyData changes (server sync)', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useSpotifyDeviceSync(data, mockExecuteSpotify, 'Connected'),
      { initialProps: { data: defaultSpotifyData } }
    )

    const newData = {
      ...defaultSpotifyData,
      playback: { ...defaultSpotifyData.playback, volume_percent: 80 },
    }

    rerender({ data: newData })

    expect(result.current.displayVolume).toBe(80)
  })

  it('does NOT update state from server sync while sliding', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useSpotifyDeviceSync(data, mockExecuteSpotify, 'Connected'),
      { initialProps: { data: defaultSpotifyData } }
    )

    // User starts sliding
    act(() => {
      result.current.handleVolumeChange(60)
    })

    // Server sends update (old value)
    const newData = {
      ...defaultSpotifyData,
      playback: { ...defaultSpotifyData.playback, volume_percent: 50 },
    }
    rerender({ data: newData })

    // Should keep user value
    expect(result.current.displayVolume).toBe(60)
  })

  it('sends command and commits volume when sliding stops', () => {
    const activeDeviceData = {
      ...defaultSpotifyData,
      devices: [
        {
          id: 'dev1',
          is_active: true,
          name: 'Device 1',
          type: 'Computer',
          volume_percent: 50,
          is_private_session: false,
          is_restricted: false,
        },
      ],
    }

    const { result } = renderHook(() =>
      useSpotifyDeviceSync(activeDeviceData, mockExecuteSpotify, 'Connected')
    )

    act(() => {
      result.current.handleVolumeChangeCommitted(75)
    })

    expect(mockExecuteSpotify).toHaveBeenCalledWith('SET_VOLUME', {
      volume: 75,
      deviceId: 'dev1',
    })
  })

  it('auto-selects active device', () => {
    const activeDeviceData = {
      ...defaultSpotifyData,
      devices: [
        {
          id: 'dev1',
          is_active: true,
          name: 'Device 1',
          type: 'Computer',
          volume_percent: 50,
          is_private_session: false,
          is_restricted: false,
        },
      ],
    }

    const { result } = renderHook(() =>
      useSpotifyDeviceSync(activeDeviceData, mockExecuteSpotify, 'Connected')
    )

    expect(result.current.selectedDeviceId).toBe('dev1')
  })

  it('toggles mute correctly', () => {
    const activeDeviceData = {
      ...defaultSpotifyData,
      devices: [
        {
          id: 'dev1',
          is_active: true,
          name: 'Device 1',
          type: 'Computer',
          volume_percent: 50,
          is_private_session: false,
          is_restricted: false,
        },
      ],
    }

    const { result } = renderHook(() =>
      useSpotifyDeviceSync(activeDeviceData, mockExecuteSpotify, 'Connected')
    )

    // Mute
    act(() => {
      result.current.handleToggleMute()
    })

    expect(result.current.isMuted).toBe(true)
    expect(mockExecuteSpotify).toHaveBeenCalledWith('SET_VOLUME', {
      volume: 0,
      deviceId: 'dev1',
    })

    // Unmute (restores last volume)
    act(() => {
      result.current.handleToggleMute()
    })

    expect(result.current.isMuted).toBe(false)
    expect(mockExecuteSpotify).toHaveBeenCalledWith('SET_VOLUME', {
      volume: 50, // Should restore last known volume
      deviceId: 'dev1',
    })
  })
})
