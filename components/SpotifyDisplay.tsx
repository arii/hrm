'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { signOut } from 'next-auth/react'
import AuthButton from './AuthButton'
import VolumeSlider from './shared/VolumeSlider'
import SpotifyDeviceSelector from './SpotifyDeviceSelector'
import DeviceRecommendation from './Spotify/DeviceRecommendation'

// 1. State Shape
interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  isSliding: boolean
  lastVolume: number // Last non-zero volume
  selectedDeviceId: string
  deviceMenuAnchor: null | HTMLElement
}

// 2. Actions
type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_SLIDING'; payload: boolean }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SELECT_DEVICE'; payload: string }
  | { type: 'OPEN_DEVICE_MENU'; payload: HTMLElement }
  | { type: 'CLOSE_DEVICE_MENU' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

// 3. Reducer Logic
const spotifyDisplayReducer = (
  state: SpotifyDisplayState,
  action: SpotifyDisplayAction
): SpotifyDisplayState => {
  switch (action.type) {
    case 'SYNC_WITH_WEBSOCKET': {
      if (state.isSliding) return state
      const { volume, isMuted } = action.payload
      const newVolume = volume ?? state.displayVolume
      return {
        ...state,
        displayVolume: newVolume,
        isMuted: isMuted ?? state.isMuted,
        lastVolume: newVolume > 0 ? newVolume : state.lastVolume,
      }
    }
    case 'SET_SLIDING':
      return { ...state, isSliding: action.payload }
    case 'SET_VOLUME':
      return {
        ...state,
        isSliding: true,
        displayVolume: action.payload,
        isMuted: action.payload === 0,
        lastVolume: action.payload > 0 ? action.payload : state.lastVolume,
      }
    case 'TOGGLE_MUTE': {
      const newMutedState = !state.isMuted
      if (newMutedState) {
        // Muting: set volume to 0
        return {
          ...state,
          isMuted: true,
          displayVolume: 0,
        }
      } else {
        // Unmuting: restore to last known volume
        return {
          ...state,
          isMuted: false,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50, // fallback
        }
      }
    }
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDeviceId: action.payload,
        deviceMenuAnchor: null,
      }
    case 'OPEN_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: action.payload }
    case 'CLOSE_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: null }
    default:
      return state
  }
}

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  // 4. Integrate useReducer
  const [state, dispatch] = useReducer(spotifyDisplayReducer, {
    displayVolume: spotifyData.playback.volume_percent ?? 70,
    isMuted: spotifyData.isMuted ?? false,
    isSliding: false,
    lastVolume:
      spotifyData.playback.volume_percent &&
      spotifyData.playback.volume_percent > 0
        ? spotifyData.playback.volume_percent
        : 70,
    selectedDeviceId: '',
    deviceMenuAnchor: null,
  })
  const { displayVolume, isMuted, selectedDeviceId, deviceMenuAnchor } = state

  // Track the last time volume command was sent to prevent sync race conditions
  const lastVolumeSendTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const { player, isReady, deviceId } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useSpotifyRemoteExecution(player)

  // Synchronize with WebSocket data whenever it changes
  // Grace period prevents race conditions when volume commands are in flight
  useEffect(() => {
    const timeSinceLastSend = Date.now() - lastVolumeSendTimeRef.current
    const GRACE_PERIOD_MS = 500 // Wait 500ms after sending before syncing from server

    // Only apply grace period if a send is pending and within the window
    const shouldRespectGracePeriod =
      hasPendingSendRef.current && timeSinceLastSend < GRACE_PERIOD_MS

    if (state.isSliding || shouldRespectGracePeriod) {
      return
    }

    // Once grace period has elapsed, clear the pending send flag
    if (hasPendingSendRef.current && timeSinceLastSend >= GRACE_PERIOD_MS) {
      hasPendingSendRef.current = false
    }

    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: {
        volume: spotifyData.playback.volume_percent,
        isMuted: spotifyData.isMuted,
      },
    })
  }, [
    spotifyData.playback.volume_percent,
    spotifyData.isMuted,
    state.isSliding,
  ])

  // Centralized command sender for volume changes
  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        spotifyData.devices?.find((device) => device.is_active)?.id

      const sanitized = clampVolume(volume)

      lastVolumeSendTimeRef.current = Date.now()
      hasPendingSendRef.current = true

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })
    },
    [connectionStatus, selectedDeviceId, executeSpotify, spotifyData.devices]
  )

  // Handler for immediate UI update while sliding
  const handleVolumeChange = (newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume }) // Update UI immediately
  }

  // Handler for sending the final volume value after sliding stops
  const handleVolumeChangeCommitted = (newVolume: number) => {
    sendVolumeCommand(newVolume)
    dispatch({ type: 'SET_SLIDING', payload: false }) // Reset sliding state
  }

  // Handler for the VolumeSlider's mute button
  const handleToggleMute = useCallback(() => {
    // Calculate the next state to determine the command payload
    const newMutedState = !isMuted
    const newVolume = newMutedState
      ? 0
      : state.lastVolume > 0
        ? state.lastVolume
        : 50

    dispatch({ type: 'TOGGLE_MUTE' }) // Update UI
    sendVolumeCommand(newVolume) // Send command with the new volume
  }, [isMuted, state.lastVolume, sendVolumeCommand])

  // Effect to auto-select the active device
  useEffect(() => {
    const devices = spotifyData.devices || []
    if (devices.length === 0) {
      if (selectedDeviceId !== '') {
        dispatch({ type: 'SELECT_DEVICE', payload: '' })
      }
      return
    }
    const activeDevice = devices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice.id })
      return
    }
    if (
      selectedDeviceId &&
      !devices.some((device) => device.id === selectedDeviceId)
    ) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice?.id ?? '' })
    }
  }, [spotifyData.devices, selectedDeviceId])

  const handlePlayPauseToggle = () => {
    if (spotifyData.playback.is_playing) {
      executeSpotify('PAUSE')
    } else {
      executeSpotify('PLAY')
    }
  }

  const handleDeviceSelect = (deviceId: string) => {
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    executeSpotify('TRANSFER_PLAYBACK', { deviceId })
  }

  if (!isLoggedIn) {
    return (
      <Box
        data-testid="spotify-auth-container"
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
        }}
      >
        <AuthButton providerId="spotify" providerName="Spotify" />
      </Box>
    )
  }

  if (isLoggedIn) {
    const isWaiting = spotifyData.playback.track.name === 'Awaiting Login...'
    const displayTrackName = isWaiting
      ? 'No Active Playback'
      : spotifyData.playback.track.name
    const displayArtist = isWaiting
      ? ''
      : `— ${spotifyData.playback.track.artist}`

    return (
      <Box
        data-testid="spotify-display-container"
        aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
          spotifyData.playback.is_playing ? 'Playing' : 'Paused'
        }${isReady ? ', Browser player ready' : ''}`}
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderRadius: 2,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifySelf: 'start',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600 }}
            data-testid="spotify-now-playing"
          >
            {displayTrackName} {displayArtist}
          </Typography>
          {!isReady && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'info.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              🔄 Connecting Player...
            </Typography>
          )}
          {isReady && deviceId && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'success.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              🎵 Browser Player Active
            </Typography>
          )}
          <DeviceRecommendation />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifySelf: 'center',
          }}
        >
          <IconButton
            size="small"
            onClick={() => executeSpotify('PREVIOUS')}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Previous track"
            data-testid="spotify-previous-button"
          >
            <SkipPreviousIcon />
          </IconButton>
          <IconButton
            size="medium"
            onClick={handlePlayPauseToggle}
            sx={{
              color: 'common.white',
              backgroundColor: 'grey.700',
              '&:hover': { backgroundColor: 'grey.600' },
            }}
            aria-label={spotifyData.playback.is_playing ? 'Pause' : 'Play'}
            data-testid="spotify-play-pause-button"
          >
            {spotifyData.playback.is_playing ? (
              <PauseIcon />
            ) : (
              <PlayArrowIcon />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => executeSpotify('NEXT')}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Next track"
            data-testid="spotify-next-button"
          >
            <SkipNextIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifySelf: 'end',
            gap: 1,
          }}
        >
          <VolumeSlider
            volume={displayVolume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onVolumeChangeCommitted={handleVolumeChangeCommitted}
            onToggleMute={handleToggleMute}
            showValue={true}
          />
          <SpotifyDeviceSelector
            availableDevices={spotifyData.devices || []}
            deviceMenuAnchor={deviceMenuAnchor}
            onDeviceSelect={handleDeviceSelect}
            onMenuOpen={(e) =>
              dispatch({ type: 'OPEN_DEVICE_MENU', payload: e.currentTarget })
            }
            onMenuClose={() => dispatch({ type: 'CLOSE_DEVICE_MENU' })}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleLogout}
            data-testid="spotify-logout-button"
            sx={{
              color: 'common.white',
              borderColor: 'grey.600',
              '&:hover': {
                borderColor: 'grey.500',
                backgroundColor: 'grey.800',
              },
              minWidth: 'auto',
              px: 1.5,
              fontSize: '0.75rem',
            }}
          >
            Logout
          </Button>
        </Box>
      </Box>
    )
  }

  return null
}

export default SpotifyDisplay
