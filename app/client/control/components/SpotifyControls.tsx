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
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import { Device } from '@spotify/web-api-ts-sdk'

const SpotifyControls = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { volume, setVolume } = useVolumePreference()
  const lastSentVolumeRef = useRef<string | null>(null)

  const [availableDevices, setAvailableDevices] = useState<Device[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false)
  const [devicesError, setDevicesError] = useState<string | null>(null)

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'

  useEffect(() => {
    if (hasSpotifyData) {
      const fetchDevices = async () => {
        setDevicesLoading(true)
        setDevicesError(null)
        try {
          const response = await fetch('/api/spotify/devices')
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const devices = await response.json()
          setAvailableDevices(Array.isArray(devices) ? devices : [])
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to load devices.'
          console.error('Failed to fetch Spotify devices:', error)
          setDevicesError(errorMessage)
        } finally {
          setDevicesLoading(false)
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
      setDevicesLoading(false)
      setDevicesError(null)
    }
  }, [hasSpotifyData])

  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }

    const lastDeviceId = localStorage.getItem('spotify_last_device_id')
    if (lastDeviceId && availableDevices.some((d) => d.id === lastDeviceId)) {
      setSelectedDeviceId(lastDeviceId)
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

  useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem('spotify_last_device_id', selectedDeviceId)
    }
  }, [selectedDeviceId])

  const resolveTargetDeviceId = useCallback(() => {
    if (selectedDeviceId) {
      return selectedDeviceId
    }
    const activeDevice = availableDevices.find((device) => device.is_active)
    return activeDevice?.id
  }, [availableDevices, selectedDeviceId])

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      overriddenDeviceId?: string
    ) => {
      const targetDeviceId =
        overriddenDeviceId !== undefined
          ? overriddenDeviceId
          : resolveTargetDeviceId()
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
      }
      sendData(message)
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
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
      }
      sendData(message)
      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, resolveTargetDeviceId, sendData]
  )

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  useEffect(() => {
    sendVolumeCommand(volume)
  }, [volume, sendVolumeCommand])

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    setVolume(newValue as number)
  }

  return (
    <Card
      sx={{
        boxShadow: 3,
        mb: 3,
        backgroundColor: 'grey.800',
        color: 'white',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
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
          <Box>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="body1" noWrap>
                {spotifyData.trackName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {spotifyData.artist}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <IconButton
                onClick={() => sendSpotifyCommand('PREVIOUS')}
                disabled={connectionStatus !== 'Connected'}
                color="inherit"
              >
                <SkipPrevious />
              </IconButton>
              <IconButton
                onClick={() =>
                  sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')
                }
                disabled={connectionStatus !== 'Connected'}
                color="inherit"
                size="large"
              >
                {spotifyData.isPlaying ? (
                  <Pause sx={{ fontSize: 40 }} />
                ) : (
                  <PlayArrow sx={{ fontSize: 40 }} />
                )}
              </IconButton>
              <IconButton
                onClick={() => sendSpotifyCommand('NEXT')}
                disabled={connectionStatus !== 'Connected'}
                color="inherit"
              >
                <SkipNext />
              </IconButton>
            </Stack>

            {availableDevices.length > 0 && (
              <FormControl fullWidth sx={{ mb: 1 }}>
                <Select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    const newDeviceId = e.target.value
                    setSelectedDeviceId(newDeviceId)
                    sendSpotifyCommand('TRANSFER_PLAYBACK', newDeviceId)
                  }}
                  disabled={devicesLoading || connectionStatus !== 'Connected'}
                  size="small"
                  sx={{
                    color: 'white',
                    '& .MuiSvgIcon-root': { color: 'white' },
                    '&.MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'grey.600',
                      },
                      '&:hover fieldset': {
                        borderColor: 'grey.500',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1DB954',
                      },
                    },
                  }}
                >
                  {availableDevices
                    .filter((device) => device.id)
                    .map((device) => (
                      <MenuItem key={device.id} value={device.id!}>
                        {device.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
            {devicesError && (
              <Typography
                color="error"
                variant="body2"
                sx={{ textAlign: 'center', mb: 1 }}
              >
                {devicesError}
              </Typography>
            )}

            <Stack spacing={2} direction="row" alignItems="center">
              <VolumeUp />
              <Slider
                aria-label="Volume"
                value={volume}
                onChange={handleVolumeChange}
                disabled={
                  connectionStatus !== 'Connected' || !resolveTargetDeviceId()
                }
                sx={{ color: '#1DB954' }}
              />
            </Stack>
          </Box>
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
