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
  LinearProgress,
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
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [_devicesError, setDevicesError] = useState<string | null>(null)

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
          <>
            {spotifyData.albumArtUrl && (
              <Box
                component="img"
                src={spotifyData.albumArtUrl}
                alt="Album art"
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 1,
                  mb: 2,
                }}
              />
            )}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {spotifyData.trackName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                {spotifyData.artist}
              </Typography>
            </Box>
            {spotifyData.durationMs && spotifyData.progressMs ? (
              <LinearProgress
                variant="determinate"
                value={
                  (spotifyData.progressMs / spotifyData.durationMs) * 100
                }
                sx={{ mb: 2 }}
              />
            ) : null}
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              sx={{ mb: 2 }}
            >
              <IconButton
                onClick={() => sendSpotifyCommand('PREVIOUS')}
                disabled={connectionStatus !== 'Connected'}
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
                disabled={connectionStatus !== 'Connected'}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
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
                onChangeCommitted={(_, val) => sendVolumeCommand(val as number)}
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
            {availableDevices.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
                  Device
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const deviceId = e.target.value
                      setSelectedDeviceId(deviceId)
                      if (deviceId) {
                        sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
                      }
                    }}
                    disabled={
                      connectionStatus !== 'Connected' || devicesLoading
                    }
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey.600',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      },
                    }}
                  >
                    {availableDevices.map((device) => (
                      <MenuItem key={device.id} value={device.id}>
                        {device.name} {device.is_active && '(Active)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
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
