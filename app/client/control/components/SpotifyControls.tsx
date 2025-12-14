// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import VolumeUp from '@mui/icons-material/VolumeUp'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommand, SpotifyCommandMessage } from '@/types/websocket'
import { clamp } from '@/utils/number'

const clampVolume = (value: number): number => clamp(Math.round(value), 0, 100)
import PlaybackControls from './PlaybackControls'

const SpotifyControls = () => {
  const router = useRouter()
  // 1. Destructure devices directly from spotifyData
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { devices = [] } = spotifyData // Default to empty array if undefined
  const { volume, setVolume } = useVolumePreference()
  const lastSentVolumeRef = useRef<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'

  // 3. Request devices on mount or connection
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })
    }
  }, [connectionStatus, sendData])

  // 4. Update selection logic and volume sync
  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    // Sync Selected Device
    if (prevActiveIdRef.current === undefined && activeId) {
      // Initial sync
      setSelectedDeviceId(activeId)
    } else if (activeId && activeId !== prevActiveIdRef.current) {
      // Active device changed externally, update selection
      setSelectedDeviceId(activeId)
    } else {
      // Check if selected device is still valid
      const selectedStillExists = devices.some((d) => d.id === selectedDeviceId)
      if (selectedDeviceId && !selectedStillExists) {
        setSelectedDeviceId(activeId ?? '')
      }
      if (!selectedDeviceId && activeId) {
        setSelectedDeviceId(activeId)
      }
    }
    prevActiveIdRef.current = activeId

    // Sync Volume (if not dragging)
    if (
      !isDragging &&
      activeDevice &&
      typeof activeDevice.volume_percent === 'number'
    ) {
      if (activeDevice.volume_percent !== volume) {
        setVolume(activeDevice.volume_percent)
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]) // Rely on devices update to trigger sync

  const resolveTargetDeviceId = useCallback(() => {
    if (selectedDeviceId) {
      return selectedDeviceId
    }
    const activeDevice = devices.find((device) => device.is_active)
    return activeDevice?.id
  }, [devices, selectedDeviceId])

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

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        sendSpotifyCommand(command)
      }
    },
    [sendSpotifyCommand]
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

            <Stack direction="row" spacing={1} alignItems="center">
              <VolumeUp sx={{ color: 'grey.400', fontSize: 20 }} />
              <Slider
                value={volume}
                onChange={(_, val) => {
                  setIsDragging(true)
                  setVolume(val as number)
                }}
                onChangeCommitted={(_, val) => {
                  setIsDragging(false)
                  sendVolumeCommand(val as number)
                }}
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
            {devices.length > 0 && (
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
                    disabled={connectionStatus !== 'Connected'}
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
                    {devices.map((device) => (
                      <MenuItem key={device.id} value={device.id}>
                        {device.name} {device.is_active && '(Active)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryMusic />}
              onClick={handleBrowseClick}
              sx={{ mt: 2, borderColor: 'grey.600', color: 'grey.300' }}
            >
              Select Playlist
            </Button>
          </>
        ) : (
          <Button onClick={handleBrowseClick}>Select Music</Button>
        )}
      </CardContent>
    </Card>
  )
}

export default SpotifyControls
