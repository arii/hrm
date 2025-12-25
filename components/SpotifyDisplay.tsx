'use client'
import { useTheme } from '@mui/material/styles'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useSession, signOut } from 'next-auth/react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import AuthButton from './AuthButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'
import { useState, useReducer, useEffect, useCallback, useRef } from 'react'

interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  lastVolume: number
}

type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

const initialStateFactory = (
  volume: number,
  isMuted: boolean
): SpotifyDisplayState => ({
  displayVolume: volume,
  isMuted: isMuted,
  lastVolume: volume > 0 ? volume : 70,
})

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
        return {
          ...state,
          isMuted: true,
          displayVolume: 0,
        }
      } else {
        return {
          ...state,
          isMuted: false,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50,
        }
      }
    }
    default:
      return state
  }
}

const SpotifyDisplay = () => {
  const theme = useTheme()
  const { status } = useSession()
  const { spotifyData, sendData } = useWebSocket()
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume ?? 70, spotifyData.isMuted ?? false)
  )

  const { displayVolume, isMuted } = state

  useEffect(() => {
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: { volume: spotifyData.volume, isMuted: spotifyData.isMuted },
    })
  }, [spotifyData.volume, spotifyData.isMuted])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const sendSpotifyCommand = (
    command:
      | 'PLAY'
      | 'PAUSE'
      | 'NEXT'
      | 'PREVIOUS'
      | 'TRANSFER_PLAYBACK'
      | 'SET_VOLUME',
    payload?: Record<string, unknown>
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      ...payload,
    }
    sendData(message)
  }

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  const handleDeviceSelect = (deviceId: string) => {
    sendSpotifyCommand('TRANSFER_PLAYBACK', { deviceId })
    setDeviceMenuAnchor(null)
  }

  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(() => {
        sendSpotifyCommand('SET_VOLUME', { volume })
      }, 300)
    },
    [sendData]
  )

  const handleVolumeChange = (newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume })
    sendVolumeCommand(newVolume)
  }

  const handleToggleMute = () => {
    dispatch({ type: 'TOGGLE_MUTE' })
    const newVolume = isMuted ? state.lastVolume : 0
    sendVolumeCommand(newVolume)
  }

  if (status !== 'authenticated') {
    return (
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
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

  const { trackName, artist, isPlaying, devices } = spotifyData
  const displayTrackName =
    trackName === 'Awaiting Login...' ? 'No Active Playback' : trackName
  const displayArtist = trackName === 'Awaiting Login...' ? '' : `— ${artist}`

  return (
    <Box
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${isPlaying ? 'Playing' : 'Paused'}`}
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
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
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size="small"
          onClick={() => sendSpotifyCommand('PREVIOUS')}
          color="inherit"
          aria-label="Previous track"
        >
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          size="medium"
          onClick={handlePlayPauseToggle}
          color="inherit"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => sendSpotifyCommand('NEXT')}
          color="inherit"
          aria-label="Next track"
        >
          <SkipNextIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
        <VolumeSlider
          volume={displayVolume}
          muted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
        />
        <SpotifyDeviceSelectorWrapper
          availableDevices={devices || []}
          deviceMenuAnchor={deviceMenuAnchor}
          onDeviceSelect={handleDeviceSelect}
          onMenuOpen={(e) => setDeviceMenuAnchor(e.currentTarget)}
          onMenuClose={() => setDeviceMenuAnchor(null)}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogout}
          color="inherit"
          sx={{
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

export default SpotifyDisplay
