'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import {
  Box,
  Button,
  IconButton,
  Typography,
} from '@mui/material'
import { signIn, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

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
  const { spotifyData, sendData } = useWebSocket()
  const { data: session } = useSession()
  console.log('spotifyData.trackName:', spotifyData.trackName)
  useVolumePreference(70)
  const {
    isReady,
    deviceId,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [_deviceMenuAnchor, _setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

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

  const handleSpotifyLogin = () => {
    signIn('spotify', { callbackUrl: '/' })
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

  // If we are logged in, we show the player bar.
  // We handle the specific "Awaiting Login..." text by replacing it with "No Active Playback"
  // or simply showing the controls so the user can transfer playback.
  if (spotifyLoggedIn) {
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
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Next track"
          >
            <SkipNextIcon />
          </IconButton>
        </Box>
      </Box>
    )
  }

  return null
}

export default SpotifyDisplay
