// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import DevicesIcon from '@mui/icons-material/Devices'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Popover from '@mui/material/Popover'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommand, SpotifyCommandMessage } from '@/types/websocket'
import PlaybackControls from './PlaybackControls'
import VolumeSlider from '@/components/Spotify/VolumeSlider'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'
import SpotifyDevicePicker from '@/components/Spotify/SpotifyDevicePicker'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'

const SpotifyControls = () => {
  const router = useRouter()
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { devices, transferPlayback } = useSpotifyDevices()
  const { volume, setVolume, muted, toggleMute } = useVolumePreference()
  const lastSentVolumeRef = useRef<string | null>(null)

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handleDevicePickerClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget)
  }

  const handleDevicePickerClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)
  const id = open ? 'device-picker-popover' : undefined

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'

  const resolveTargetDeviceId = useCallback(() => {
    const activeDevice = devices.find((device) => device.is_active)
    return activeDevice?.id
  }, [devices])

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        const targetDeviceId = resolveTargetDeviceId()
        const message: SpotifyCommandMessage = {
          type: 'SPOTIFY_COMMAND',
          command,
          ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
        }
        sendData(message)
      }
    },
    [resolveTargetDeviceId, sendData]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId = resolveTargetDeviceId()
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
    [connectionStatus, resolveTargetDeviceId, sendData]
  )

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    debounceTimeoutRef.current = setTimeout(() => {
      sendVolumeCommand(volume)
    }, 300)
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    }
  }, [volume, sendVolumeCommand])

  const handleSelectDevice = (deviceId: string) => {
    transferPlayback(deviceId)
    handleDevicePickerClose()
  }

  return (
    <Card
      data-testid="spotify-controls-card"
      sx={{
        mb: 3,
        color: 'white',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            color: '#1DB954',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MusicNote sx={{ mr: 1 }} /> Spotify
        </Typography>

        {hasSpotifyData ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {spotifyData.trackName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                {spotifyData.artist}
              </Typography>
            </Box>

            <PlaybackControls
              isPlaying={spotifyData.isPlaying}
              onCommand={handlePlaybackCommand}
              disabled={connectionStatus !== 'Connected'}
            />

            <VolumeSlider
              volume={volume}
              muted={muted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<LibraryMusic />}
                onClick={handleBrowseClick}
                sx={{ borderColor: 'grey.600', color: 'grey.300' }}
              >
                Playlist
              </Button>
              <Button
                aria-describedby={id}
                variant="outlined"
                size="small"
                startIcon={<DevicesIcon />}
                onClick={handleDevicePickerClick}
                sx={{ borderColor: 'grey.600', color: 'grey.300' }}
              >
                Devices
              </Button>
            </Box>

            <Popover
              id={id}
              open={open}
              anchorEl={anchorEl}
              onClose={handleDevicePickerClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <Box sx={{ p: 2, background: 'rgba(40, 51, 69, 0.9)' }}>
                <SpotifyDevicePicker
                  devices={devices}
                  onSelectDevice={handleSelectDevice}
                />
              </Box>
            </Popover>
          </>
        ) : (
          <Button onClick={handleBrowseClick}>Select Music</Button>
        )}
      </CardContent>
    </Card>
  )
}

export default SpotifyControls
