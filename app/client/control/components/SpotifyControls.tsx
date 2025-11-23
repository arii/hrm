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
import { SpotifyCommandMessage, SpotifyDevice } from '@/types/websocket'

const SpotifyControls = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { volume, setVolume } = useVolumePreference(70)

  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const lastSentVolumeRef = useRef<string | null>(null)

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
      if (!sendData) return
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

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected' || !sendData) return
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
    const handler = setTimeout(() => {
      sendVolumeCommand(volume)
    }, 200)

    return () => {
      clearTimeout(handler)
    }
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

        {hasSpotifyData ? (
          <Box>
            <Typography noWrap sx={{ textAlign: 'center', mb: 1 }}>
              {spotifyData.trackName} &mdash; {spotifyData.artist}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <IconButton color="inherit" size="small" onClick={() => sendSpotifyCommand('PREVIOUS')} aria-label="previous track"><SkipPrevious /></IconButton>
              <IconButton color="inherit" size="medium" onClick={handlePlayPauseToggle} aria-label={spotifyData.isPlaying ? 'pause' : 'play'}>
                {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton color="inherit" size="small" onClick={() => sendSpotifyCommand('NEXT')} aria-label="next track"><SkipNext /></IconButton>
            </Box>
            <Stack spacing={2} direction="row" sx={{ mt: 1 }} alignItems="center">
              <VolumeUp />
              <Slider
                aria-label="Volume"
                value={volume}
                onChange={(_, value) => setVolume(value as number)}
              />
            </Stack>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <Select
                value={selectedDeviceId || ''}
                onChange={(e) => sendSpotifyCommand('TRANSFER_PLAYBACK', e.target.value)}
                displayEmpty
                inputProps={{ 'aria-label': 'Select Device' }}
                sx={{ color: 'white', '& .MuiSvgIcon-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' } }}
              >
                {devicesLoading && <MenuItem value=""><em>Loading devices...</em></MenuItem>}
                {devicesError && <MenuItem value=""><em>Error: {devicesError}</em></MenuItem>}
                {!devicesLoading && !devicesError && availableDevices.length === 0 && <MenuItem value=""><em>No devices available</em></MenuItem>}
                {availableDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>{device.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: 'grey.400', textAlign: 'center' }}
          >
            Login to Spotify on the main dashboard to see controls.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default SpotifyControls