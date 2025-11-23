// File: components/SpotifyDisplay.tsx
'use client'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import { Device } from '@spotify/web-api-ts-sdk'
import {
  Box,
  Button,
  Card,
  CardMedia,
  IconButton,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  VolumeUp,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Speaker as SpeakerIcon,
} from '@mui/icons-material'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'

const SpotifyDisplay = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { data: session, status } = useSession()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const {
    player,
    isReady,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [availableDevices, setAvailableDevices] = useState<Device[]>([])
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )
  const deviceMenuOpen = Boolean(deviceMenuAnchor)

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        availableDevices.find((device) => device.is_active)?.id

      if (!targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: targetDeviceId,
      }
      sendData(message)
      lastSentVolumeRef.current = messageKey
    },
    [availableDevices, connectionStatus, selectedDeviceId, sendData]
  )

  useEffect(() => {
    sendVolumeCommand(volume)
  }, [volume, sendVolumeCommand])

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  useEffect(() => {
    if (!player || typeof player.setVolume !== 'function') return
    const scalar = Math.min(Math.max(volume / 100, 0), 1)
    player
      .setVolume(scalar)
      .catch((err) =>
        console.warn('[Dashboard] Failed to adjust local Spotify volume:', err)
      )
  }, [player, volume])

  const spotifyLoggedIn =
    Boolean(session?.accessToken) && Boolean(spotifyAuthenticated)

  useEffect(() => {
    if (spotifyLoggedIn) {
      const fetchDevices = async () => {
        try {
          const response = await fetch('/api/spotify/devices')
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const devices = await response.json()
          const deviceArray = Array.isArray(devices) ? devices : []
          setAvailableDevices(deviceArray)
        } catch (error) {
          console.error('[Dashboard] Failed to fetch Spotify devices:', error)
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
    }
  }, [spotifyLoggedIn, isReady, spotifyData.trackName]) // re-fetch when track changes

  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }
    const activeDevice = availableDevices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice && activeDevice.id) {
      setSelectedDeviceId(activeDevice.id)
      return
    }
    if (
      selectedDeviceId &&
      !availableDevices.some((device) => device.id === selectedDeviceId)
    ) {
      setSelectedDeviceId(activeDevice?.id ?? '')
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
    setSelectedDeviceId(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
    setDeviceMenuAnchor(null)
  }

  const handleSpotifyLogin = () => {
    signIn('spotify', { callbackUrl: '/' })
  }

  const handleSpotifyLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (status === 'loading') {
    return null // Avoid flicker
  }

  if (!session?.accessToken) {
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
          bottom: { xs: 56, sm: 16 },
          left: { xs: 0, sm: '50%' },
          transform: { sm: 'translateX(-50%)' },
          right: { xs: 0, sm: 'auto' },
          width: { xs: '100%', sm: 'auto' },
          zIndex: 1100,
          boxShadow: 3,
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={handleSpotifyLogin}
          sx={{ px: 4, py: 1 }}
        >
          Login with Spotify
        </Button>
      </Box>
    )
  }

  if (spotifyLoggedIn) {
    const isWaiting = spotifyData.trackName === 'Awaiting Login...'
    const displayTrackName = isWaiting ? 'No Active Playback' : spotifyData.trackName
    const displayArtistName = isWaiting ? '' : spotifyData.artist

    return (
      <Box
        aria-label={`Now playing: ${displayTrackName} by ${displayArtistName}`}
        sx={{
          backgroundColor: 'rgba(25, 20, 20, 0.7)',
          backdropFilter: 'blur(10px)',
          color: 'common.white',
          px: 2,
          py: 1,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          bottom: { xs: 56, sm: 16 },
          left: { xs: 0, sm: 16 },
          right: { xs: 0, sm: 16 },
          zIndex: 1100,
          boxShadow: 3,
          gap: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} flexShrink={1} minWidth={0}>
          <Card sx={{ width: 56, height: 56, flexShrink: 0 }}>
            {spotifyData.albumArtUrl ? (
              <CardMedia
                component="img"
                image={spotifyData.albumArtUrl}
                alt="album art"
              />
            ) : null}
          </Card>
          <Box minWidth={0}>
            <Typography variant="body1" fontWeight={600} noWrap>
              {displayTrackName}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {displayArtistName}
            </Typography>
          </Box>
        </Stack>

        {!isMobile && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="large" onClick={() => sendSpotifyCommand('PREVIOUS')} color="inherit">
              <SkipPreviousIcon />
            </IconButton>
            <IconButton size="large" onClick={handlePlayPauseToggle} color="inherit">
              {spotifyData.isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
            </IconButton>
            <IconButton size="large" onClick={() => sendSpotifyCommand('NEXT')} color="inherit">
              <SkipNextIcon />
            </IconButton>
          </Stack>
        )}

        <Stack direction="row" alignItems="center" spacing={1.5}>
          {!isMobile && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 120 }}>
              <VolumeUp />
              <Slider
                value={volume}
                onChange={(_, val) => setVolume(val as number)}
                onChangeCommitted={(_, val) => sendVolumeCommand(val as number)}
                size="small"
                sx={{ color: '#1DB954' }}
              />
            </Stack>
          )}

          <Tooltip title={isReady ? 'Browser player active' : webPlaybackError ? 'Player error' : 'Connecting player...'}>
            <IconButton onClick={(e) => setDeviceMenuAnchor(e.currentTarget)} color="inherit">
              <SpeakerIcon sx={{ color: isReady ? 'success.main' : webPlaybackError ? 'error.main' : 'inherit' }} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={deviceMenuAnchor}
            open={deviceMenuOpen}
            onClose={() => setDeviceMenuAnchor(null)}
          >
            {availableDevices
              .filter((device) => device.id)
              .map((device) => (
                <MenuItem
                  key={device.id}
                  onClick={() => handleDeviceSelect(device.id!)}
                  selected={selectedDeviceId === device.id}
                >
                  {device.name}
                </MenuItem>
              ))}
          </Menu>

          <Button variant="outlined" size="small" onClick={handleSpotifyLogout} color="inherit">
            Logout
          </Button>
        </Stack>
      </Box>
    )
  }

  return null
}

export default SpotifyDisplay
