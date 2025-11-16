// File: components/SpotifyDisplay.tsx
'use client'
import {
  Pause,
  PlayArrow,
  SkipNext,
  SkipPrevious,
  Speaker,
  VolumeUp,
  Login,
  Logout,
} from '@mui/icons-material'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Slider,
  Stack,
  Button,
  Menu,
  MenuItem,
  Chip,
  Badge,
} from '@mui/material'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useState, useRef } from 'react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import useWebSocket from '@/hooks/useWebSocket'
import { SpotifyCommandMessage } from '@/types/websocket'

interface SpotifyDevice {
  id: string
  is_active: boolean
  name: string
}

const SpotifyDisplay = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { data: session } = useSession()
  const { volume, setVolume } = useVolumePreference(70)
  const { isReady, deviceId, error: webPlaybackError } = useSpotifyWebPlayback()
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(null)

  const sendSpotifyCommand = useCallback(
    (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK', deviceId?: string) => {
      const activeDevice = availableDevices.find((d) => d.is_active)
      const targetDeviceId = deviceId || activeDevice?.id
      if (!targetDeviceId) return
      sendData({ type: 'SPOTIFY_COMMAND', command, deviceId: targetDeviceId })
    },
    [availableDevices, sendData]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const sanitized = clampVolume(value)
      const activeDevice = availableDevices.find((d) => d.is_active)
      if (!activeDevice) return
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: activeDevice.id,
      })
    },
    [connectionStatus, sendData, availableDevices]
  )

  // Debounced volume sender
  useEffect(() => {
    const handler = setTimeout(() => sendVolumeCommand(volume), 200)
    return () => clearTimeout(handler)
  }, [volume, sendVolumeCommand])

  useEffect(() => {
    if (session?.accessToken) {
      const fetchDevices = async () => {
        try {
          const response = await fetch('/api/spotify/devices')
          const devices = await response.json()
          setAvailableDevices(Array.isArray(devices) ? devices : [])
        } catch (error) {
          console.error('[Dashboard] Failed to fetch Spotify devices:', error)
        }
      }
      fetchDevices()
    }
  }, [session, spotifyData.trackName]) // Refreshes on track change

  const handleDeviceSelect = (deviceId: string) => {
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
    setDeviceMenuAnchor(null)
  }

  if (!session) {
    return (
      <Card sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, height: '100%' }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<Login />}
          onClick={() => signIn('spotify', { callbackUrl: '/' })}
        >
          Login with Spotify
        </Button>
      </Card>
    )
  }

  const activeDevice = availableDevices.find((d) => d.is_active)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" noWrap>
              {spotifyData.trackName || 'No Track Playing'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" noWrap>
              {spotifyData.artist || '...'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
            <IconButton onClick={() => sendSpotifyCommand('PREVIOUS')} aria-label="Previous Track">
              <SkipPrevious />
            </IconButton>
            <IconButton onClick={() => sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')} aria-label="Play/Pause">
              {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton onClick={() => sendSpotifyCommand('NEXT')} aria-label="Next Track">
              <SkipNext />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <VolumeUp color="action" />
            <Slider
              value={volume}
              onChange={(_, val) => setVolume(val as number)}
              min={0}
              max={100}
              color="success"
            />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
            <IconButton onClick={(e) => setDeviceMenuAnchor(e.currentTarget)} size="small">
              <Badge color="success" variant="dot" invisible={!activeDevice}>
                <Speaker />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={deviceMenuAnchor}
              open={Boolean(deviceMenuAnchor)}
              onClose={() => setDeviceMenuAnchor(null)}
            >
              {availableDevices.map((device) => (
                <MenuItem
                  key={device.id}
                  selected={device.is_active}
                  onClick={() => handleDeviceSelect(device.id)}
                >
                  {device.name}
                </MenuItem>
              ))}
            </Menu>

            {isReady && deviceId && <Chip label="Browser Player" size="small" color="info" />}
            {webPlaybackError && <Chip label="Player Error" size="small" color="error" />}

            <Button
              variant="outlined"
              size="small"
              onClick={() => signOut({ callbackUrl: '/' })}
              startIcon={<Logout />}
            >
              Logout
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default SpotifyDisplay
