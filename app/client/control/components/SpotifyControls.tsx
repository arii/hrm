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
import { SpotifyControlsState, SpotifyControlsAction } from '@/types/core'
import {
  HRM_WEB_PLAYER_NAME,
  VOLUME_SYNC_GRACE_PERIOD_MS,
} from '@/constants/spotify'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'
import VolumeSlider from '@/components/shared/VolumeSlider'
import { SPOTIFY_BRAND_COLOR } from '@/constants/spotify'

const VOLUME_SLIDER_SX = { mt: 3, mb: 1 }

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
      const newVolume = isMuted ? 0 : (volume ?? state.displayVolume)
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
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50, // fallback
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
  const { devices = [] } = spotifyData // Default to empty array if undefined
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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const lastSentVolumeRef = useRef<string | null>(null)
  const lastWarningTimeRef = useRef<number>(0)

  const hrmDevice = useMemo(
    () =>
      devices.find(
        (d) => d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
      ),
    [devices]
  )

  const handleTrackSelect = (uri: string) => {
    const targetDeviceId = resolveTargetDeviceId()
    executeSpotify('PLAY', {
      uri: uri,
      deviceId: targetDeviceId,
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

  const resolveTargetDeviceId = useCallback(() => {
    return (
      selectedDeviceId ||
      devices.find((device) => device.is_active)?.id ||
      hrmDevice?.id
    )
  }, [devices, selectedDeviceId, hrmDevice])

  useEffect(() => {
    if (devices.length === 0) return

    const resolvedId = resolveTargetDeviceId()
    if (resolvedId && selectedDeviceId !== resolvedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDeviceId(resolvedId)
    }
  }, [devices, selectedDeviceId, resolveTargetDeviceId])

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      overriddenDeviceId?: string
    ) => {
      const deviceId =
        overriddenDeviceId !== undefined
          ? overriddenDeviceId
          : resolveTargetDeviceId()

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
    [resolveTargetDeviceId, executeSpotify]
  )

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        sendSpotifyCommand(command)
      }
    },
    [sendSpotifyCommand]
  )

  const handleVolumeChange = useCallback(
    (val: number) => {
      dispatch({ type: 'SET_VOLUME', payload: val })
      if (connectionStatus !== 'Connected') {
        const now = Date.now()
        // Throttle warning to once every 3 seconds to avoid spam during sliding
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
      const targetDeviceId = resolveTargetDeviceId()

      // Prevent sending volume command if no device is targeted
      if (!targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })

      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, resolveTargetDeviceId, executeSpotify]
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
    sendVolumeCommand(newVolume) // Send command with the new volume
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
              isPlaying={spotifyData.playback.is_playing}
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
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const deviceId = e.target.value as string
                      setSelectedDeviceId(deviceId)
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
