// File: app/client/control/components/SpotifyControls.tsx
'use client'
import {
  MusicNote,
  Pause,
  PlayArrow,
  SkipNext,
  SkipPrevious,
  VolumeUp,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import useVolumePreference, {
  clampVolume,
} from '@/hooks/useVolumePreference'
import useWebSocket from '@/hooks/useWebSocket'
import { SpotifyCommandMessage } from '@/types/websocket'

interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

const SpotifyControls = () => {
  const { spotifyData, sendData } = useWebSocket()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/spotify/devices')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const devices = await response.json()
        setAvailableDevices(Array.isArray(devices) ? devices : [])
      } catch (error) {
        console.error('Failed to fetch Spotify devices:', error)
      }
    }
    fetchDevices()
  }, [])

  useEffect(() => {
    const activeDevice = availableDevices.find((device) => device.is_active)
    if (activeDevice) {
      setSelectedDeviceId(activeDevice.id)
    }
  }, [availableDevices])

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK'
    ) => {
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId: selectedDeviceId,
      }
      sendData(message)
    },
    [sendData, selectedDeviceId]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      const sanitized = clampVolume(value)
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: selectedDeviceId,
      }
      sendData(message)
      lastSentVolumeRef.current = `${selectedDeviceId}:${sanitized}`
    },
    [sendData, selectedDeviceId]
  )

  useEffect(() => {
    sendVolumeCommand(volume)
  }, [volume, sendVolumeCommand])

  return (
    <Card
      sx={{
        boxShadow: 3,
        mb: 3,
        backgroundColor: 'grey.800',
        color: 'white',
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

        {spotifyData.trackName && spotifyData.trackName !== 'Awaiting Login...' ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {spotifyData.trackName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                {spotifyData.artist}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              sx={{ mb: 2 }}
            >
              <IconButton
                onClick={() => sendSpotifyCommand('PREVIOUS')}
                sx={{
                  color: 'white',
                  '&:hover': { backgroundColor: 'grey.700' },
                }}
              >
                <SkipPrevious />
              </IconButton>
              <IconButton
                onClick={() =>
                  sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')
                }
                sx={{
                  color: 'white',
                  backgroundColor: '#1DB954',
                  '&:hover': { backgroundColor: '#169944' },
                }}
              >
                {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton
                onClick={() => sendSpotifyCommand('NEXT')}
                sx={{
                  color: 'white',
                  '&:hover': { backgroundColor: 'grey.700' },
                }}
              >
                <SkipNext />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <VolumeUp sx={{ color: 'grey.400', fontSize: 20 }} />
              <Slider
                value={volume}
                onChange={(_, val) => setVolume(val as number)}
                onChangeCommitted={(_, val) =>
                  sendVolumeCommand(val as number)
                }
                min={0}
                max={100}
                size="small"
                sx={{
                  color: '#1DB954',
                  '& .MuiSlider-thumb': { backgroundColor: 'white' },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'grey.400', minWidth: '3ch' }}
              >
                {volume}
              </Typography>
            </Stack>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Dashboard to Select Device
              </Button>
            </Box>
          </>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: 'grey.400', textAlign: 'center' }}
          >
            Login to Spotify on the main dashboard
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default SpotifyControls
