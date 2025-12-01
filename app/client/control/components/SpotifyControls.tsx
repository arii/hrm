// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import Pause from '@mui/icons-material/Pause'
import PlayArrow from '@mui/icons-material/PlayArrow'
import SkipNext from '@mui/icons-material/SkipNext'
import SkipPrevious from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
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
  const { volume, setVolume } = useVolumePreference()
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
                  backgroundColor: '#1DB954',
                  '&:hover': { backgroundColor: '#169944' },
                }}
              >
                {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
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
