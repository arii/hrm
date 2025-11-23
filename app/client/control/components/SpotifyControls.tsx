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
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [devicesLoading, setDevicesLoading] = useState(false)
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

      // Prevent sending volume command if no device is targeted
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
            <Typography noWrap>
              {spotifyData.trackName} - {spotifyData.artist}
            </Typography>
            <Stack spacing={2} direction="row" sx={{ my: 1 }} alignItems="center" justifyContent="center">
              <IconButton onClick={() => sendSpotifyCommand('PREVIOUS')} color="inherit"><SkipPrevious /></IconButton>
              <IconButton onClick={() => sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')} color="inherit">
                {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton onClick={() => sendSpotifyCommand('NEXT')} color="inherit"><SkipNext /></IconButton>
            </Stack>
            <Stack spacing={2} direction="row" sx={{ my: 1 }} alignItems="center">
              <VolumeUp />
              <Slider value={volume} onChange={(_, v) => setVolume(v as number)} />
            </Stack>
            <FormControl fullWidth size="small">
              <Select
                value={selectedDeviceId}
                onChange={(e) => {
                  const newDeviceId = e.target.value as string
                  setSelectedDeviceId(newDeviceId)
                  sendSpotifyCommand('TRANSFER_PLAYBACK', newDeviceId)
                }}
                displayEmpty
                disabled={devicesLoading}
                sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey.500',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey.400',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1DB954',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
                }}
              >
                <MenuItem value="" disabled>
                  {devicesLoading ? 'Loading Devices...' : 'Select Device'}
                </MenuItem>
                {availableDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {devicesError && <Typography color="error">{devicesError}</Typography>}
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
