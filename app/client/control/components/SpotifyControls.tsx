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
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import useWebSocket from '@/hooks/useWebSocket'
import { SpotifyCommandMessage } from '@/types/websocket'

interface SpotifyDevice {
  id: string
  is_active: boolean
  name: string
}

const SpotifyControls = () => {
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState<string | null>(null)

  const hasSpotifyData =
    spotifyData.trackName &&
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== 'No Track Playing'

  useEffect(() => {
    if (hasSpotifyData) {
      const fetchDevices = async () => {
        setDevicesLoading(true)
        setDevicesError(null)
        try {
          const response = await fetch('/api/spotify/devices')
          if (!response.ok) throw new Error('Failed to fetch devices')
          const devices = await response.json()
          setAvailableDevices(Array.isArray(devices) ? devices : [])
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : 'An unknown error occurred'
          console.error('Failed to fetch Spotify devices:', msg)
          setDevicesError(msg)
        } finally {
          setDevicesLoading(false)
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
    }
  }, [hasSpotifyData])

  useEffect(() => {
    const activeDevice = availableDevices.find((d) => d.is_active)
    if (activeDevice && selectedDeviceId !== activeDevice.id) {
      setSelectedDeviceId(activeDevice.id)
    } else if (!activeDevice && !selectedDeviceId && availableDevices.length > 0) {
      setSelectedDeviceId(availableDevices[0].id)
    }
  }, [availableDevices, selectedDeviceId])

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      deviceId?: string
    ) => {
      const targetDeviceId = deviceId ?? selectedDeviceId
      if (!targetDeviceId) return
      sendData({
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId: targetDeviceId,
      } as SpotifyCommandMessage)
    },
    [sendData, selectedDeviceId]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected' || !selectedDeviceId) return
      const sanitized = clampVolume(value)
      const messageKey = `${selectedDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: selectedDeviceId,
      })
      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, sendData, selectedDeviceId]
  )

  // Effect to handle volume changes
  useEffect(() => {
    const handler = setTimeout(() => {
      sendVolumeCommand(volume);
    }, 200); // Debounce volume changes

    return () => clearTimeout(handler);
  }, [volume, sendVolumeCommand]);


  return (
    <Card>
      <CardContent>
        <Typography
          variant="h5"
          align="center"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <MusicNote sx={{ mr: 1 }} color="success" /> Spotify
        </Typography>

        {hasSpotifyData ? (
          <>
            <Box textAlign="center" mb={2}>
              <Typography variant="h6" noWrap>
                {spotifyData.trackName}
              </Typography>
              <Typography variant="body1" color="text.secondary" noWrap>
                {spotifyData.artist}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
              <IconButton
                onClick={() => sendSpotifyCommand('PREVIOUS')}
                disabled={connectionStatus !== 'Connected'}
                color="secondary"
              >
                <SkipPrevious fontSize="large" />
              </IconButton>
              <IconButton
                onClick={() => sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')}
                disabled={connectionStatus !== 'Connected'}
                color="primary"
                sx={{
                  transform: 'scale(1.2)',
                }}
              >
                {spotifyData.isPlaying ? (
                  <Pause fontSize="large" />
                ) : (
                  <PlayArrow fontSize="large" />
                )}
              </IconButton>
              <IconButton
                onClick={() => sendSpotifyCommand('NEXT')}
                disabled={connectionStatus !== 'Connected'}
                color="secondary"
              >
                <SkipNext fontSize="large" />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <VolumeUp color="action" />
              <Slider
                value={volume}
                onChange={(_, val) => setVolume(val as number)}
                min={0}
                max={100}
                color="success"
              />
              <Typography variant="body2" color="text.secondary">
                {volume}
              </Typography>
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="device-select-label">Device</InputLabel>
              <Select
                labelId="device-select-label"
                value={selectedDeviceId}
                label="Device"
                onChange={(e) => {
                  const deviceId = e.target.value
                  setSelectedDeviceId(deviceId)
                  sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
                }}
                disabled={connectionStatus !== 'Connected' || devicesLoading || availableDevices.length === 0}
              >
                {devicesLoading && (
                  <MenuItem value="">
                    <CircularProgress size={20} />
                  </MenuItem>
                )}
                {devicesError && <MenuItem disabled>{devicesError}</MenuItem>}
                {availableDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        ) : (
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Login to Spotify on the main dashboard.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default SpotifyControls
