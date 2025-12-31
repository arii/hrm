'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSession, signOut } from 'next-auth/react'
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
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import AuthButton from './AuthButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'

// 1. State Shape
interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  lastVolume: number // Last non-zero volume
  selectedDeviceId: string
  deviceMenuAnchor: null | HTMLElement
}

// 2. Actions
type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SELECT_DEVICE'; payload: string }
  | { type: 'OPEN_DEVICE_MENU'; payload: HTMLElement }
  | { type: 'CLOSE_DEVICE_MENU' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

// 3. Initial State Factory
const initialStateFactory = (
  volume: number | undefined,
  isMuted: boolean
): SpotifyDisplayState => ({
  displayVolume: volume ?? 70,
  isMuted: isMuted,
  lastVolume: volume && volume > 0 ? volume : 70, // Store last non-zero volume
  selectedDeviceId: '',
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
  const { data: session, status } = useSession()

  // Effect to handle session-level errors, like token refresh failure
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      // Sign out to clear the invalid session
      signOut()
    }
  }, [session])

  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSliding, setIsSliding] = useState(false)

  // 5. Integrate useReducer
  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume, spotifyData.isMuted ?? false)
  )
  const { displayVolume, isMuted, selectedDeviceId, deviceMenuAnchor } = state

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const isReady = false
  const deviceId = ''
  const spotifyAuthenticated = false

  // Synchronize local UI state with WebSocket data (the source of truth)
  useEffect(() => {
    if (isSliding) {
      return
    }
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: { volume: spotifyData.volume, isMuted: spotifyData.isMuted },
    })
  }, [spotifyData.volume, spotifyData.isMuted, isSliding])


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
        <AuthButton providerId="spotify" providerName="Spotify" />
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

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifySelf: 'end',
            gap: 1,
          }}
        >
          <SpotifyDeviceSelectorWrapper
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
