'use client'

import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'
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

interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  isSliding: boolean
  lastVolume: number
  selectedDeviceId: string
  deviceMenuAnchor: null | HTMLElement
}

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
      return {
        ...state,
        isMuted: newMutedState,
        displayVolume: newMutedState
          ? 0
          : state.lastVolume > 0
            ? state.lastVolume
            : 50,
      }
    }
    case 'SELECT_DEVICE':
      return { ...state, selectedDeviceId: action.payload }
    case 'OPEN_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: action.payload }
    case 'CLOSE_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: null }
    default:
      return state
  }
}

export default function SpotifyDisplay() {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  const [state, dispatch] = useReducer(spotifyDisplayReducer, {
    displayVolume: spotifyData.playback.volume_percent ?? 70,
    isMuted: spotifyData.playback.isMuted ?? false,
    isSliding: false,
    lastVolume:
      (spotifyData.playback.volume_percent ?? 0) > 0
        ? (spotifyData.playback.volume_percent as number)
        : 70,
    selectedDeviceId: '',
    deviceMenuAnchor: null,
  })

  const { displayVolume, isMuted, selectedDeviceId, deviceMenuAnchor } = state
  const hasActiveDevice =
    !!selectedDeviceId ||
    spotifyData.devices?.some((device) => device.is_active)
  const lastVolumeSendTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const { player, isReady, deviceId } = useSpotifyWebPlayback()
  useDashboardRegistration(player)

  useEffect(() => {
    const timeSinceLastSend = Date.now() - lastVolumeSendTimeRef.current
    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (state.isSliding || shouldRespectGracePeriod) return

    if (
      hasPendingSendRef.current &&
      timeSinceLastSend >= VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      hasPendingSendRef.current = false
    }

    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: {
        volume: spotifyData.playback.volume_percent,
        isMuted: spotifyData.playback.isMuted,
      },
    })
  }, [
    spotifyData.playback.volume_percent,
    spotifyData.playback.isMuted,
    state.isSliding,
  ])

  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        spotifyData.devices?.find((device) => device.is_active)?.id
      if (!targetDeviceId) return

      lastVolumeSendTimeRef.current = Date.now()
      hasPendingSendRef.current = true
      executeSpotify('SET_VOLUME', {
        volume: clampVolume(volume),
        deviceId: targetDeviceId,
      })
    },
    [connectionStatus, selectedDeviceId, executeSpotify, spotifyData.devices]
  )

  const handleVolumeChange = (newVolume: number) =>
    dispatch({ type: 'SET_VOLUME', payload: newVolume })
  const handleVolumeChangeCommitted = (newVolume: number) => {
    sendVolumeCommand(newVolume)
    dispatch({ type: 'SET_SLIDING', payload: false })
  }

  const handleToggleMute = useCallback(() => {
    const newMutedState = !isMuted
    const newVolume = newMutedState
      ? 0
      : state.lastVolume > 0
        ? state.lastVolume
        : 50
    dispatch({ type: 'TOGGLE_MUTE' })
    sendVolumeCommand(newVolume)
  }, [isMuted, state.lastVolume, sendVolumeCommand])

  useEffect(() => {
    const devices = spotifyData.devices || []
    if (devices.length === 0) {
      if (selectedDeviceId !== '')
        dispatch({ type: 'SELECT_DEVICE', payload: '' })
      return
    }
    const activeDevice = devices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice.id })
    } else if (
      selectedDeviceId &&
      !devices.some((device) => device.id === selectedDeviceId)
    ) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice?.id ?? '' })
    }
  }, [spotifyData.devices, selectedDeviceId])

  const handlePlayPauseToggle = () =>
    executeSpotify(spotifyData.playback.is_playing ? 'PAUSE' : 'PLAY')
  const handleDeviceSelect = (deviceId: string) => {
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    dispatch({ type: 'CLOSE_DEVICE_MENU' })
    executeSpotify('TRANSFER_PLAYBACK', { deviceId })
  }

  const containerStyles = {
    backgroundColor: 'grey.900',
    color: 'common.white',
    px: { xs: 1, sm: 2 },
    py: 0.5,
    borderRadius: 0,
    width: '100%',
    minHeight: '48px',
  }

  if (!isLoggedIn) {
    return (
      <Box
        data-testid="spotify-auth-container"
        sx={{
          ...containerStyles,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AuthButton providerId="spotify" providerName="Spotify" />
      </Box>
    )
  }

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
      sx={{
        ...containerStyles,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifySelf: 'start',
          gap: 2,
          minHeight: '32px',
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
              whiteSpace: 'nowrap',
            }}
          >
            🔄 Connecting...
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
              whiteSpace: 'nowrap',
            }}
          >
            🎵 Active
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
          sx={{ color: 'common.white' }}
          aria-label="Previous track"
          data-testid="spotify-previous-button"
        >
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          size="medium"
          onClick={handlePlayPauseToggle}
          sx={{ color: 'common.white', backgroundColor: 'grey.700' }}
          aria-label={spotifyData.playback.is_playing ? 'Pause' : 'Play'}
          data-testid="spotify-play-pause-button"
        >
          {spotifyData.playback.is_playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => executeSpotify('NEXT')}
          sx={{ color: 'common.white' }}
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
          disabled={!hasActiveDevice}
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
