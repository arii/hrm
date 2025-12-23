'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSession, signOut } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { clampVolume } from '@/hooks/useVolumePreference'
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
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import { useCallback, useEffect, useState, useRef } from 'react'
import logger from '@/utils/logger'
import SpotifyLoginButton from './SpotifyLoginButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'
import { SpotifyDevice } from '@/types/core'

const SpotifyDisplay = () => {
  const { status } = useSession()
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [deviceMenuAnchorEl, setDeviceMenuAnchorEl] =
    useState<null | HTMLElement>(null)

  const {
    player,
    isReady,
    deviceId: localPlayerDeviceId,
  } = useSpotifyWebPlayback()
  useSpotifyRemoteExecution(player)

  const sendSpotifyCommand = useCallback(
    (
      command: SpotifyCommandMessage['command'],
      options: Partial<Pick<SpotifyCommandMessage, 'volume' | 'deviceId'>> = {}
    ) => {
      if (connectionStatus !== 'Connected') return

      const targetDeviceId =
        options.deviceId ||
        selectedDeviceId ||
        availableDevices.find((d) => d.is_active)?.id

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...options,
      }
      if (targetDeviceId) {
        message.deviceId = targetDeviceId
      }
      sendData(message)
    },
    [connectionStatus, sendData, selectedDeviceId, availableDevices]
  )

  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = clampVolume(newVolume)
    player?.setVolume(clampedVolume / 100)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      sendSpotifyCommand('SET_VOLUME', { volume: clampedVolume })
    }, 300)
  }

  const handleToggleMute = useCallback(() => {
    const newMutedState = !spotifyData.isMuted
    const volume = newMutedState ? 0 : 50
    sendSpotifyCommand('SET_VOLUME', { volume })
  }, [spotifyData.isMuted, sendSpotifyCommand])

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', { deviceId })
    setDeviceMenuAnchorEl(null)
  }

  useEffect(() => {
    if (status === 'authenticated' && spotifyData.trackName) {
      const fetchDevices = async () => {
        try {
          const response = await fetch(API_SPOTIFY_DEVICES)
          if (!response.ok) throw new Error('Failed to fetch devices')
          const devices: SpotifyDevice[] = await response.json()
          setAvailableDevices(devices)
          const activeDevice = devices.find((d) => d.is_active)
          if (activeDevice && !selectedDeviceId) {
            setSelectedDeviceId(activeDevice.id)
          }
        } catch (error) {
          logger.error({ error }, 'Failed to fetch Spotify devices')
          setAvailableDevices([])
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
    }
  }, [status, spotifyData.trackName, selectedDeviceId])

  if (status === 'loading') {
    return (
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
    )
  }

  if (status !== 'authenticated') {
    return (
      <Card
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <SpotifyLoginButton />
      </Card>
    )
  }

  const isWaiting = spotifyData.trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting
    ? 'No Active Playback'
    : spotifyData.trackName
  const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`
  const isActiveDevice = selectedDeviceId === localPlayerDeviceId

  return (
    <Card
      elevation={2}
      aria-label={`Spotify Player: ${displayTrackName} by ${spotifyData.artist}`}
      sx={{ height: '100%' }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Track Info & Status */}
          <Box sx={{ minWidth: 0, flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {displayTrackName}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {displayArtist}
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: 'flex',
                gap: 1,
                justifyContent: { xs: 'center', md: 'flex-start' },
              }}
            >
              {!isReady && (
                <Chip
                  label="Connecting Player..."
                  size="small"
                  variant="outlined"
                  color="info"
                />
              )}
              {isReady && (
                <Chip
                  label="Browser Player Ready"
                  size="small"
                  variant={isActiveDevice ? 'filled' : 'outlined'}
                  color={isActiveDevice ? 'success' : 'default'}
                />
              )}
            </Box>
          </Box>

          {/* Playback Controls */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconButton
              onClick={() => sendSpotifyCommand('PREVIOUS')}
              aria-label="Previous track"
            >
              <SkipPreviousIcon />
            </IconButton>
            <IconButton
              size="large"
              onClick={() =>
                sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')
              }
              aria-label={spotifyData.isPlaying ? 'Pause' : 'Play'}
              sx={{
                mx: 1,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
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
            >
              <SkipNextIcon />
            </IconButton>
          </Box>

          {/* Volume, Device, Logout */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 2,
              flex: 1,
              width: { xs: '100%', md: 'auto' },
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, flex: 1, maxWidth: 150 }}>
              <VolumeSlider
                volume={spotifyData.volume ?? 0}
                muted={spotifyData.isMuted ?? false}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
              />
            </Box>
            <SpotifyDeviceSelectorWrapper
              availableDevices={availableDevices}
              deviceMenuAnchor={deviceMenuAnchorEl}
              onDeviceSelect={handleDeviceSelect}
              onMenuOpen={(e) => setDeviceMenuAnchorEl(e.currentTarget)}
              onMenuClose={() => setDeviceMenuAnchorEl(null)}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => signOut({ redirect: false })}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default SpotifyDisplay
