'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import { VolumeUp } from '@mui/icons-material'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import SpeakerIcon from '@mui/icons-material/Speaker'
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

const SpotifyDisplay = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { data: session } = useSession()
  console.log('spotifyData.trackName:', spotifyData.trackName)
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const {
    player,
    isReady,
    deviceId,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
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

      // Prevent sending volume command if no device is targeted
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
  console.log(
    'spotifyLoggedIn:',
    spotifyLoggedIn,
    'session?.accessToken:',
    session?.accessToken,
    'spotifyAuthenticated:',
    spotifyAuthenticated
  )

  useEffect(() => {
    if (spotifyLoggedIn && spotifyData.trackName) {
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
  }, [spotifyLoggedIn, spotifyData.trackName, isReady])

  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }
    const activeDevice = availableDevices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
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

  if (!spotifyLoggedIn) {
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
          mb: 0,
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={handleSpotifyLogin}
          sx={{ px: 4, py: 1 }}
        >
          🎵 Login with Spotify
        </Button>
      </Box>
    )
  }

<<<<<<< HEAD
  if (spotifyData.trackName && spotifyData.trackName !== 'Awaiting Login...') {
    const progress =
      spotifyData.progressMs && spotifyData.durationMs
        ? (spotifyData.progressMs / spotifyData.durationMs) * 100
        : 0
=======
  // If we are logged in, we show the player bar.
  // We handle the specific "Awaiting Login..." text by replacing it with "No Active Playback"
  // or simply showing the controls so the user can transfer playback.
  if (spotifyLoggedIn) {
    const isWaiting = spotifyData.trackName === 'Awaiting Login...'
    const displayTrackName = isWaiting
      ? 'No Active Playback'
      : spotifyData.trackName
    const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`
>>>>>>> origin/leader

    return (
      <Box
        aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
          spotifyData.isPlaying ? 'Playing' : 'Paused'
        }${isReady ? ', Browser player ready' : ''}`}
        sx={{
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          color: 'common.white',
          boxShadow: 3,
          overflow: 'hidden',
        }}
      >
<<<<<<< HEAD
        {spotifyData.albumArtUrl && (
          <Box
            component="img"
            src={spotifyData.albumArtUrl}
            alt="Album art"
=======
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayTrackName} {displayArtist}
          </Typography>
          {spotifyAuthenticated && !isReady && !webPlaybackError && (
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
          {webPlaybackError && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.9,
                backgroundColor: 'error.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              ⚠️ Player Error
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
>>>>>>> origin/leader
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px) brightness(0.4)',
              zIndex: -1,
            }}
          />
        )}
        <Stack
          spacing={2}
          sx={{
            p: 2,
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center" flexGrow={1}>
              {spotifyData.albumArtUrl && (
                <Box
                  component="img"
                  src={spotifyData.albumArtUrl}
                  alt="Album art"
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    boxShadow: 2,
                  }}
                />
              )}
              <Box>
                <Typography variant="h6" noWrap>
                  {spotifyData.trackName}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" noWrap>
                  {spotifyData.artist}
                </Typography>
                {spotifyAuthenticated && !isReady && !webPlaybackError && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Connecting player...
                  </Typography>
                )}
                {isReady && deviceId && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Browser player active
                  </Typography>
                )}
                {webPlaybackError && (
                  <Typography variant="caption" sx={{ opacity: 0.9, color: 'error.main' }}>
                    Player error
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                onClick={() => sendSpotifyCommand('PREVIOUS')}
                aria-label="Previous track"
                sx={{ color: 'common.white' }}
              >
                <SkipPreviousIcon />
              </IconButton>
              <IconButton
                onClick={handlePlayPauseToggle}
                aria-label={spotifyData.isPlaying ? 'Pause' : 'Play'}
                sx={{
                  color: 'common.white',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
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
                sx={{ color: 'common.white' }}
              >
                <SkipNextIcon />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <VolumeUp sx={{ color: 'grey.400', fontSize: 18 }} />
              <Slider
                value={volume}
                onChange={(_, val) => setVolume(val as number)}
                onChangeCommitted={(_, val) => sendVolumeCommand(val as number)}
                min={0}
                max={100}
                size="small"
                sx={{
                  width: 80,
                  color: '#1DB954',
                  '& .MuiSlider-thumb': {
                    backgroundColor: 'white',
                    width: 12,
                    height: 12,
                  },
                  '& .MuiSlider-track': { height: 3 },
                  '& .MuiSlider-rail': { height: 3 },
                }}
              />
              <IconButton
                size="small"
                onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
                sx={{
                  color: 'common.white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
                aria-label="Select playback device"
              >
                <SpeakerIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={deviceMenuAnchor}
                open={deviceMenuOpen}
                onClose={() => setDeviceMenuAnchor(null)}
              >
                {availableDevices.map((device) => (
                  <MenuItem
                    key={device.id}
                    onClick={() => handleDeviceSelect(device.id)}
                    selected={device.is_active}
                  >
                    {device.name} {device.is_active && '✓'}
                  </MenuItem>
                ))}
              </Menu>
              <Button
                variant="outlined"
                size="small"
                onClick={handleSpotifyLogout}
                sx={{ color: 'common.white', borderColor: 'grey.600' }}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
          {spotifyData.durationMs && (
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 2, mt: 1 }}
            />
          )}
        </Stack>
      </Box>
    )
  }

  return null
}

export default SpotifyDisplay
