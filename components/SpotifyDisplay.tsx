'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useError } from '@/context/ErrorContext'
import { useSession, signOut } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import logger from '@/utils/logger'
import SpotifyLoginButton from './SpotifyLoginButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'
import { useSharedSpotifyDevices } from '@/context/SpotifyDevicesContext'

// 1. State Shape for Volume and UI
interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  lastVolume: number
  deviceMenuAnchor: null | HTMLElement
}

// 2. Actions for Volume and UI
type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'OPEN_DEVICE_MENU'; payload: HTMLElement }
  | { type: 'CLOSE_DEVICE_MENU' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

// 3. Initial State Factory
const initialStateFactory = (
  volume: number,
  isMuted: boolean
): SpotifyDisplayState => ({
  displayVolume: volume,
  isMuted: isMuted,
  lastVolume: volume > 0 ? volume : 70,
  deviceMenuAnchor: null,
})

// 4. Reducer for Volume and UI
const spotifyDisplayReducer = (
  state: SpotifyDisplayState,
  action: SpotifyDisplayAction
): SpotifyDisplayState => {
  switch (action.type) {
    case 'SYNC_WITH_WEBSOCKET': {
      const { volume, isMuted } = action.payload
      const newVolume = volume ?? state.displayVolume
      return {
        ...state,
        displayVolume: newVolume,
        isMuted: isMuted ?? state.isMuted,
        lastVolume: newVolume > 0 ? newVolume : state.lastVolume,
      }
    }
    case 'SET_VOLUME':
      return {
        ...state,
        displayVolume: action.payload,
        isMuted: action.payload === 0,
        lastVolume: action.payload > 0 ? action.payload : state.lastVolume,
      }
    case 'TOGGLE_MUTE': {
      const newMutedState = !state.isMuted
      if (newMutedState) {
        return { ...state, isMuted: true, displayVolume: 0 }
      } else {
        return {
          ...state,
          isMuted: false,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50,
        }
      }
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
  const { data: session, status } = useSession()
  const { addError } = useError()

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      addError('Spotify session expired. Please log in again.', 'persistent')
      signOut()
    }
  }, [session, addError])

  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Centralized device management
  const {
    devices: availableDevices,
    selectedDeviceId,
    selectDevice: selectSpotifyDevice,
    error: devicesError,
  } = useSharedSpotifyDevices()

  // Local state for volume and UI
  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume ?? 70, spotifyData.isMuted ?? false)
  )
  const { displayVolume, isMuted, deviceMenuAnchor } = state

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const {
    player,
    isReady,
    deviceId,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useSpotifyRemoteExecution(player)

  // Synchronize local UI state with WebSocket data (the source of truth)
  useEffect(() => {
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: { volume: spotifyData.volume, isMuted: spotifyData.isMuted },
    })
  }, [spotifyData.volume, spotifyData.isMuted])

  // Centralized command sender for volume changes
  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        availableDevices.find((device) => device.is_active)?.id
      if (!targetDeviceId) {
        console.warn(
          '[SpotifyDisplay] No target device for volume command. Aborting.'
        )
        return
      }
      const sanitized = clampVolume(volume)
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: targetDeviceId,
      }
      sendData(message)
    },
    [availableDevices, connectionStatus, selectedDeviceId, sendData]
  )

  // Handler for the VolumeSlider component's onChange
  const handleVolumeChange = (newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume }) // Update UI immediately

    // Debounce sending the command to avoid API flooding
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      sendVolumeCommand(newVolume)
    }, 300)
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

  // Effect to manage the local browser player's volume
  useEffect(() => {
    if (!player || typeof player.setVolume !== 'function') return
    const scalar = isMuted ? 0 : Math.min(Math.max(displayVolume / 100, 0), 1)
    player
      .setVolume(scalar)
      .catch((err) =>
        logger.warn({ error: err }, 'Failed to adjust local Spotify volume')
      )
  }, [player, displayVolume, isMuted])

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
    targetDeviceId?: string
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      ...(targetDeviceId && { deviceId: targetDeviceId }),
    }
    sendData(message)
  }

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  const handleDeviceSelect = (deviceId: string) => {
    selectSpotifyDevice(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
    dispatch({ type: 'CLOSE_DEVICE_MENU' })
  }

  if (!isLoggedIn) {
    return (
      <Box
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
        <SpotifyLoginButton />
      </Box>
    )
  }

  if (isLoggedIn) {
    const isWaiting = spotifyData.trackName === 'Awaiting Login...'
    const displayTrackName = isWaiting
      ? 'No Active Playback'
      : spotifyData.trackName
    const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`

    return (
      <Box
        aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
          spotifyData.isPlaying ? 'Playing' : 'Paused'
        }${isReady ? ', Browser player ready' : ''}`}
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayTrackName} {displayArtist}
          </Typography>
          {spotifyAuthenticated && !isReady && (
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
          {devicesError && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'error.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              ⚠️ Devices failed to load
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => sendSpotifyCommand('PREVIOUS')}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Previous track"
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
            aria-label={spotifyData.isPlaying ? 'Pause' : 'Play'}
          >
            {spotifyData.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => sendSpotifyCommand('NEXT')}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Next track"
          >
            <SkipNextIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeSlider
            volume={displayVolume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
          />
          <SpotifyDeviceSelectorWrapper
            availableDevices={availableDevices}
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
