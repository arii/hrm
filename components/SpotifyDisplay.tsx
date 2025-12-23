'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSession, signOut } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import { API_SPOTIFY_DEVICES } from '@/constants/apiEndpoints'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import logger from '@/utils/logger'
import SpotifyLoginButton from './SpotifyLoginButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'
import { SpotifyDevice } from '@/types/core'

// 1. State Shape
interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  lastVolume: number // Last non-zero volume
  selectedDeviceId: string
  availableDevices: SpotifyDevice[]
  deviceMenuAnchor: null | HTMLElement
}

// 2. Actions
type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_DEVICES'; payload: SpotifyDevice[] }
  | { type: 'SELECT_DEVICE'; payload: string }
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
  lastVolume: volume > 0 ? volume : 70, // Store last non-zero volume
  selectedDeviceId: '',
  availableDevices: [],
  deviceMenuAnchor: null,
})

// 4. Reducer Logic
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
    case 'SET_DEVICES':
      return { ...state, availableDevices: action.payload }
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
  const { status } = useSession()
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 5. Integrate useReducer
  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume ?? 70, spotifyData.isMuted ?? false)
  )
  const {
    displayVolume,
    isMuted,
    selectedDeviceId,
    availableDevices,
    deviceMenuAnchor,
  } = state

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

  // Effect to fetch available devices
  useEffect(() => {
    if (isLoggedIn && spotifyData.trackName) {
      const fetchDevices = async () => {
        try {
          const response = await fetch(API_SPOTIFY_DEVICES)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const devices = await response.json()
          const deviceArray = Array.isArray(devices) ? devices : []
          dispatch({ type: 'SET_DEVICES', payload: deviceArray })
        } catch (error) {
          logger.error({ error }, 'Failed to fetch Spotify devices')
        }
      }
      fetchDevices()
    } else {
      dispatch({ type: 'SET_DEVICES', payload: [] })
      dispatch({ type: 'SELECT_DEVICE', payload: '' })
    }
  }, [isLoggedIn, spotifyData.trackName, isReady])

  // Effect to auto-select the active device
  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== '') {
        dispatch({ type: 'SELECT_DEVICE', payload: '' })
      }
      return
    }
    const activeDevice = availableDevices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice.id })
      return
    }
    if (
      selectedDeviceId &&
      !availableDevices.some((device) => device.id === selectedDeviceId)
    ) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice?.id ?? '' })
    }
  }, [availableDevices, selectedDeviceId])

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
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
  }

  if (!isLoggedIn) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SpotifyLoginButton />
      </Paper>
    )
  }

  const isWaiting = spotifyData.trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting
    ? 'No Active Playback'
    : spotifyData.trackName
  const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`

  return (
    <Paper
      elevation={2}
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
        spotifyData.isPlaying ? 'Playing' : 'Paused'
      }${isReady ? ', Browser player ready' : ''}`}
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Grid container spacing={2} alignItems="center" justifyContent="center">
        {/* Track Info */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {displayTrackName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {displayArtist}
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
                mt: 1,
                display: 'inline-block',
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
                mt: 1,
                display: 'inline-block',
              }}
            >
              🎵 Browser Player Active
            </Typography>
          )}
        </Grid>

        {/* Playback Controls */}
        <Grid
          item
          xs={12}
          md={4}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton
            onClick={() => sendSpotifyCommand('PREVIOUS')}
            aria-label="Previous track"
          >
            <SkipPreviousIcon />
          </IconButton>
          <IconButton
            size="large"
            onClick={handlePlayPauseToggle}
            aria-label={spotifyData.isPlaying ? 'Pause' : 'Play'}
            sx={{
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { backgroundColor: 'primary.dark' },
            }}
          >
            {spotifyData.isPlaying ? (
              <PauseIcon fontSize="large" />
            ) : (
              <PlayArrowIcon fontSize="large" />
            )}
          </IconButton>
          <IconButton
            onClick={() => sendSpotifyCommand('NEXT')}
            aria-label="Next track"
          >
            <SkipNextIcon />
          </IconButton>
        </Grid>

        {/* Volume, Device, and Logout */}
        <Grid
          item
          xs={12}
          md={4}
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
          }}
        >
          <VolumeSlider
            volume={displayVolume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            sx={{ display: { xs: 'none', sm: 'flex' } }} // Hide on extra small screens
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
            sx={{ minWidth: 'auto', px: 1.5 }}
          >
            Logout
          </Button>
        </Grid>
      </Grid>
    </Paper>
  )

  return null
}

export default SpotifyDisplay
