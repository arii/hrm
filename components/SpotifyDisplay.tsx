'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
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
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import logger from '@/utils/logger'
import AuthButton from './AuthButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyConnectDevicePicker from './Spotify/SpotifyConnectDevicePicker'
import useSpotifyDevices from '@/hooks/useSpotifyDevices'

// 1. State Shape
interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  lastVolume: number // Last non-zero volume
}

// 2. Actions
type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
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
    default:
      return state
  }
}

const SpotifyDisplay = () => {
  const { status } = useSession()
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [optimisticDeviceId, setOptimisticDeviceId] = useState<string | null>(
    null
  )
  const {
    devices,
    loading: devicesLoading,
    error: devicesError,
    refreshDevices,
  } = useSpotifyDevices()

  // 5. Integrate useReducer
  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume ?? 70, spotifyData.isMuted ?? false)
  )
  const { displayVolume, isMuted } = state

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
        optimisticDeviceId || devices.find((d) => d.is_active)?.id
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
    [connectionStatus, sendData, devices, optimisticDeviceId]
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
    setOptimisticDeviceId(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
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
        <AuthButton />
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
      <Card
        elevation={6}
        aria-label="Spotify Controls"
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          p: 2,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          bottom: 56, // Height of BottomNavBar
          left: 0,
          right: 0,
          zIndex: 1100, // Above other content
        }}
      >
        {/* Track Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" fontWeight="bold" noWrap>
            {displayTrackName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {displayArtist}
          </Typography>
          {spotifyAuthenticated && !isReady && (
            <Typography variant="caption" color="text.secondary">
              Connecting Player...
            </Typography>
          )}
          {isReady && deviceId && (
            <Typography variant="caption" color="primary">
              Browser Player Active
            </Typography>
          )}
        </Box>

        {/* Player Controls */}
        <Box>
          <IconButton
            onClick={() => sendSpotifyCommand('PREVIOUS')}
            disabled={!devices.length || !!devicesError}
          >
            <SkipPreviousIcon />
          </IconButton>
          <IconButton
            onClick={handlePlayPauseToggle}
            disabled={!devices.length || !!devicesError}
          >
            {spotifyData.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            onClick={() => sendSpotifyCommand('NEXT')}
            disabled={!devices.length || !!devicesError}
          >
            <SkipNextIcon />
          </IconButton>
        </Box>

        {/* Volume and Device Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <VolumeSlider
            volume={displayVolume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
          />
          <SpotifyConnectDevicePicker
            devices={devices}
            loading={devicesLoading}
            error={devicesError}
            refreshDevices={refreshDevices}
            onDeviceSelect={handleDeviceSelect}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleLogout}
            sx={{ minWidth: 'auto' }}
          >
            Logout
          </Button>
        </Box>
      </Card>
    )
  }

  return null
}

export default SpotifyDisplay
