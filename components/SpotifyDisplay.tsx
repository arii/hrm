// components/SpotifyDisplay.tsx
'use client'
import { useError } from '@/context/ErrorContext'
import { useSession, signOut } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { useCallback, useEffect, useReducer, useState } from 'react'
import SpotifyAuthOverlay from './spotify/SpotifyAuthOverlay'
import SpotifyControls from './spotify/SpotifyControls'
import SpotifyDeviceSelector from './spotify/SpotifyDeviceSelector'
import SpotifyTrackInfo from './spotify/SpotifyTrackInfo'
import VolumeSlider from './Spotify/VolumeSlider'
import { useDebounce } from '@/hooks/useDebounce'

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
  const { addError } = useError()

  // Effect to handle session-level errors, like token refresh failure
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      addError('Spotify session expired. Please log in again.', 'persistent')
      // Sign out to clear the invalid session
      signOut()
    }
  }, [session, addError])

  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const [volume, setVolume] = useState(spotifyData.volume ?? 70)
  const debouncedVolume = useDebounce(volume, 300)

  // 5. Integrate useReducer
  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume, spotifyData.isMuted ?? false)
  )
  const { isMuted, selectedDeviceId, deviceMenuAnchor } = state

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
        spotifyData.devices?.find((device) => device.is_active)?.id
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
    [connectionStatus, selectedDeviceId, sendData, spotifyData.devices]
  )

  useEffect(() => {
    sendVolumeCommand(debouncedVolume)
  }, [debouncedVolume, sendVolumeCommand])

  // Handler for the VolumeSlider component's onChange
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume) // Update UI immediately
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
    return <SpotifyAuthOverlay />
  }

  if (isLoggedIn) {
    return (
      <Box
        aria-label={`Now playing: ${spotifyData.trackName} ${
          spotifyData.artist
        }, Status: ${spotifyData.isPlaying ? 'Playing' : 'Paused'}${
          isReady ? ', Browser player ready' : ''
        }`}
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
        <SpotifyTrackInfo
          trackName={spotifyData.trackName}
          artist={spotifyData.artist}
          isReady={isReady}
          deviceId={deviceId}
          isAuthenticated={spotifyAuthenticated}
        />

        <SpotifyControls
          isPlaying={spotifyData.isPlaying}
          onPlayPauseToggle={handlePlayPauseToggle}
          onSkipNext={() => sendSpotifyCommand('NEXT')}
          onSkipPrevious={() => sendSpotifyCommand('PREVIOUS')}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeSlider
            volume={volume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
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
