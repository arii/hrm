// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ControlCard from '@/components/shared/ControlCard'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  useState,
} from 'react'
import { clampVolume } from '@/utils/audioManager'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SpotifyCommand } from '@/types/websocket'
import {
  HRM_WEB_PLAYER_NAME,
  VOLUME_SYNC_GRACE_PERIOD_MS,
} from '@/constants/spotify'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'
import VolumeSlider from '@/components/shared/VolumeSlider'
import { SPOTIFY_BRAND_COLOR } from '@/constants/spotify'

const VOLUME_SLIDER_SX = { mt: 3, mb: 1 }

/**
 * State of SpotifyControls reducer
 */
interface SpotifyControlsState {
  displayVolume: number
  isSliding: boolean
  lastVolume: number
  lastActionTime: number
}

/**
 * Actions for SpotifyControls reducer
 */
type SpotifyControlsAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_SLIDING'; payload: boolean }
  | { type: 'TOGGLE_MUTE' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

const spotifyControlsReducer = (
  state: SpotifyControlsState,
  action: SpotifyControlsAction
): SpotifyControlsState => {
  switch (action.type) {
    case 'SYNC_WITH_WEBSOCKET': {
      if (
        state.isSliding ||
        Date.now() - state.lastActionTime < VOLUME_SYNC_GRACE_PERIOD_MS
      ) {
        return state
      }
      const { volume, isMuted } = action.payload
      const newVolume = isMuted ? 0 : (volume ?? state.lastVolume)
      return {
        ...state,
        displayVolume: newVolume,
        lastVolume: newVolume > 0 ? newVolume : state.lastVolume,
      }
    }
    case 'SET_SLIDING':
      return {
        ...state,
        isSliding: action.payload,
        lastActionTime: Date.now(),
      }
    case 'SET_VOLUME':
      return {
        ...state,
        isSliding: true,
        displayVolume: action.payload,
        lastVolume: action.payload > 0 ? action.payload : state.lastVolume,
        lastActionTime: Date.now(),
      }
    case 'TOGGLE_MUTE': {
      const isMuted = state.displayVolume === 0
      if (!isMuted) {
        return {
          ...state,
          displayVolume: 0,
          lastActionTime: Date.now(),
        }
      } else {
        return {
          ...state,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50,
          lastActionTime: Date.now(),
        }
      }
    }
    default:
      return state
  }
}

const SpotifyControls = () => {
  const router = useRouter()
  const { spotifyData, connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const { devices = [] } = spotifyData
  const { showWarning } = useAppSnackbar()

  const [state, dispatch] = useReducer(spotifyControlsReducer, {
    displayVolume: spotifyData.playback.isMuted
      ? 0
      : (spotifyData.playback.volume_percent ?? 70),
    isSliding: false,
    lastVolume:
      spotifyData.playback.volume_percent &&
      spotifyData.playback.volume_percent > 0
        ? spotifyData.playback.volume_percent
        : 70,
    lastActionTime: 0,
  })
  const { displayVolume } = state
  const isMuted = displayVolume === 0

  const lastSentVolumeRef = useRef<string | null>(null)
  const lastWarningTimeRef = useRef<number>(0)
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState<
    boolean | null
  >(null)
  const playbackGraceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hrmDevice = useMemo(
    () =>
      devices.find(
        (d) => d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
      ),
    [devices]
  )

  const handleTrackSelect = (uri: string) => {
    executeSpotify('PLAY', {
      uri: uri,
      deviceId: resolvedId,
    })
  }

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasSpotifyData =
    spotifyData.playback.track.name !== 'Awaiting Login...' &&
    spotifyData.playback.track.name !== '' &&
    spotifyData.playback.track.name !== 'No Track Playing'

  useEffect(() => {
    if (connectionStatus === 'Connected' && spotifyServiceInitialized) {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })
    }
  }, [connectionStatus, sendData, spotifyServiceInitialized])

  useEffect(() => {
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: {
        volume: spotifyData.playback.volume_percent,
        isMuted: spotifyData.playback.isMuted,
      },
    })
  }, [spotifyData.playback.volume_percent, spotifyData.playback.isMuted])

  const activeDeviceId = devices.find((device) => device.is_active)?.id
  const hrmDeviceId = hrmDevice?.id
  const resolvedId = activeDeviceId || hrmDeviceId || ''

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      overriddenDeviceId?: string
    ) => {
      const deviceId =
        overriddenDeviceId !== undefined ? overriddenDeviceId : resolvedId

      switch (command) {
        case 'PLAY':
          executeSpotify('PLAY', { deviceId })
          break
        case 'PAUSE':
          executeSpotify('PAUSE', { deviceId })
          break
        case 'NEXT':
          executeSpotify('NEXT', { deviceId })
          break
        case 'PREVIOUS':
          executeSpotify('PREVIOUS', { deviceId })
          break
        case 'TRANSFER_PLAYBACK':
          if (deviceId) {
            executeSpotify('TRANSFER_PLAYBACK', { deviceId })
          }
          break
      }
    },
    [resolvedId, executeSpotify]
  )

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        if (command === 'PLAY') {
          setOptimisticIsPlaying(true)
        } else if (command === 'PAUSE') {
          setOptimisticIsPlaying(false)
        }

        if (playbackGraceTimerRef.current) {
          clearTimeout(playbackGraceTimerRef.current)
        }

        playbackGraceTimerRef.current = setTimeout(() => {
          setOptimisticIsPlaying(null)
          playbackGraceTimerRef.current = null
        }, 2500)

        sendSpotifyCommand(command)
      }
    },
    [sendSpotifyCommand]
  )

  useEffect(() => {
    return () => {
      if (playbackGraceTimerRef.current) {
        clearTimeout(playbackGraceTimerRef.current)
      }
    }
  }, [])

  const handleVolumeChange = useCallback(
    (val: number) => {
      dispatch({ type: 'SET_VOLUME', payload: val })
      if (connectionStatus !== 'Connected') {
        const now = Date.now()
        if (now - lastWarningTimeRef.current > 3000) {
          showWarning('Changes not saved: Offline')
          lastWarningTimeRef.current = now
        }
      }
    },
    [connectionStatus, showWarning]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return

      if (!resolvedId) return

      const sanitized = clampVolume(value)
      const messageKey = `${resolvedId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: resolvedId,
      })

      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, resolvedId, executeSpotify]
  )

  const handleVolumeChangeCommitted = useCallback(
    (val: number) => {
      dispatch({ type: 'SET_SLIDING', payload: false })
      sendVolumeCommand(val)
    },
    [sendVolumeCommand]
  )

  const handleToggleMute = useCallback(() => {
    const newVolume = !isMuted
      ? 0
      : state.lastVolume > 0
        ? state.lastVolume
        : 50

    dispatch({ type: 'TOGGLE_MUTE' })
    sendVolumeCommand(newVolume)
  }, [isMuted, state.lastVolume, sendVolumeCommand])

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  return (
    <ControlCard
      data-testid="spotify-controls"
      sx={{
        mb: 3,
        color: 'white',
        background: 'rgba(30, 41, 59, 0.7)',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            color: '#1DB954',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MusicNote sx={{ mr: 1 }} /> Spotify
        </Typography>

        <Box sx={{ mb: 2 }}>
          <SpotifySearchInput onTrackSelect={handleTrackSelect} />
        </Box>

        {hasSpotifyData ? (
          <>
            <Box
              sx={{
                textAlign: 'center',
                mb: 2,
                minHeight: '4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 'medium', lineHeight: 1.2 }}
                >
                  {spotifyData.playback.track.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'grey.400', lineHeight: 1.2 }}
                >
                  {spotifyData.playback.track.artist}
                </Typography>
              </>
            </Box>

            <PlaybackControls
              isPlaying={
                optimisticIsPlaying !== null
                  ? optimisticIsPlaying
                  : spotifyData.playback.is_playing
              }
              onCommand={handlePlaybackCommand}
              disabled={connectionStatus !== 'Connected'}
            />

            <VolumeSlider
              volume={displayVolume}
              muted={isMuted}
              onVolumeChange={handleVolumeChange}
              onVolumeChangeCommitted={handleVolumeChangeCommitted}
              onToggleMute={handleToggleMute}
              showValue
              sliderColor={SPOTIFY_BRAND_COLOR}
              size="medium"
              sx={VOLUME_SLIDER_SX}
            />

            {devices.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
                  Device
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={resolvedId}
                    onChange={(e) => {
                      const deviceId = e.target.value as string
                      if (deviceId) {
                        sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
                      }
                    }}
                    disabled={connectionStatus !== 'Connected'}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey.600',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      },
                    }}
                    data-testid="spotify-device-select"
                  >
                    {devices.map((device) => (
                      <MenuItem
                        key={device.id}
                        value={device.id}
                        data-testid={`spotify-device-select-option-${device.id}`}
                      >
                        {device.name} {device.is_active && '(Active)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryMusic />}
              onClick={handleBrowseClick}
              sx={{ mt: 2, borderColor: 'grey.600', color: 'grey.300' }}
              data-testid="spotify-select-playlist-button"
            >
              Select Playlist
            </Button>
          </>
        ) : (
          <Button
            onClick={handleBrowseClick}
            data-testid="spotify-select-music-button"
          >
            Select Music
          </Button>
        )}
      </CardContent>
    </ControlCard>
  )
}

export default SpotifyControls
