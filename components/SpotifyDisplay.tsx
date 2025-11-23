'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import useWebSocket from '@/hooks/useWebSocket'
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
  Menu,
  MenuItem,
  Slider,
  Typography,
} from '@mui/material'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'

const SpotifyDisplay = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { data: session } = useSession()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const {
    player,
    isReady,
    deviceId,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )
  const deviceMenuOpen = Boolean(deviceMenuAnchor)

  const spotifyLoggedIn =
    Boolean(session?.accessToken) && Boolean(spotifyAuthenticated)

  const {
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
  } = useSpotifyDevices(
    spotifyLoggedIn &&
      spotifyData.trackName !== '' &&
      spotifyData.trackName !== 'Awaiting Login...'
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const sanitized = clampVolume(value)
      const targetDeviceId =
        selectedDeviceId ||
        availableDevices.find((device) => device.is_active)?.id
      const messageKey = `${targetDeviceId ?? 'default'}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
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

  useEffect(() => {
    if (isReady && deviceId) {
      // Automatically transfer playback to the new web player
      sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, deviceId])

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

  if (spotifyData.trackName && spotifyData.trackName !== 'Awaiting Login...') {
    return (
      <Box
        aria-label={`Now playing: ${spotifyData.trackName} by ${
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
          mb: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {spotifyData.trackName} — {spotifyData.artist}
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
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Select playback device"
          >
            <SpeakerIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={deviceMenuAnchor}
            open={deviceMenuOpen}
            onClose={() => setDeviceMenuAnchor(null)}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            {availableDevices.length > 0 ? (
              availableDevices.map((device) => (
                <MenuItem
                  key={device.id}
                  onClick={() => handleDeviceSelect(device.id)}
                  selected={device.is_active}
                >
                  {device.name} {device.is_active && '✓'}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No devices available</MenuItem>
            )}
          </Menu>

          <Button
            variant="outlined"
            size="small"
            onClick={handleSpotifyLogout}
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
