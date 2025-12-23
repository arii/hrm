'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSession, signOut } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { useAudio } from '@/context/AudioContext'
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
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import logger from '@/utils/logger'
import SpotifyLoginButton from './SpotifyLoginButton'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'
import { SpotifyDevice } from '@/types/core'

const SpotifyDisplay = () => {
  const { status } = useSession()
  const { spotifyData, sendData } = useWebSocket()
  const { volume, setVolume, isMuted } = useAudio()
  const isLoggedIn = status === 'authenticated'
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

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
    if (spotifyData.volume !== undefined) {
      setVolume(spotifyData.volume)
    }
  }, [spotifyData.volume, setVolume])

  // Effect to manage the local browser player's volume
  useEffect(() => {
    if (!player || typeof player.setVolume !== 'function') return
    const scalar = isMuted ? 0 : Math.min(Math.max(volume / 100, 0), 1)
    player
      .setVolume(scalar)
      .catch((err) =>
        logger.warn({ error: err }, 'Failed to adjust local Spotify volume')
      )
  }, [player, volume, isMuted])

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
          setAvailableDevices(deviceArray)
        } catch (error) {
          logger.error({ error }, 'Failed to fetch Spotify devices')
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
    }
  }, [isLoggedIn, spotifyData.trackName, isReady])

  // Effect to auto-select the active device
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
        <SpotifyLoginButton />
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
          <SpotifyDeviceSelectorWrapper
            availableDevices={availableDevices}
            deviceMenuAnchor={deviceMenuAnchor}
            onDeviceSelect={handleDeviceSelect}
            onMenuOpen={(e) => setDeviceMenuAnchor(e.currentTarget)}
            onMenuClose={() => setDeviceMenuAnchor(null)}
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
