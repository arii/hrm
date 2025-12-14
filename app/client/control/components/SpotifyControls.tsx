// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useWebSocket } from '@/context/WebSocketContext'
import { useDebounce } from '@/hooks/useDebounce'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { SpotifyCommand, SpotifyCommandMessage } from '@/types/websocket'
import PlaybackControls from './PlaybackControls'
import VolumeSlider from '@/components/PlaybackControls/VolumeSlider'

const SpotifyControls = () => {
  const router = useRouter()
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { devices = [] } = spotifyData // Default to empty array if undefined

  // State Management
  const { volume, setVolume, muted, toggleMute } = useVolumePreference()
  const debouncedVolume = useDebounce(volume, 300)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const lastSentVolumeRef = useRef<string | null>(null)
  const isInitialMount = useRef(true)
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'

  // Effect: Request devices on mount or connection
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })
    }
  }, [connectionStatus, sendData])

  // Effect: Synchronize device selection and volume with incoming data
  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    // Sync Selected Device ID
    if (prevActiveIdRef.current === undefined && activeId) {
      setSelectedDeviceId(activeId) // Initial sync
    } else if (activeId && activeId !== prevActiveIdRef.current) {
      setSelectedDeviceId(activeId) // Active device changed externally
    } else {
      // Validate existing selection
      const selectedStillExists = devices.some((d) => d.id === selectedDeviceId)
      if (selectedDeviceId && !selectedStillExists) {
        setSelectedDeviceId(activeId ?? '') // Selected device disappeared
      } else if (!selectedDeviceId && activeId) {
        setSelectedDeviceId(activeId) // No selection, but active device exists
      }
    }
    prevActiveIdRef.current = activeId

    // Sync Volume from active device, but only if the user is not actively dragging the slider
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
  }, [devices, isDragging]) // Re-run if devices change or dragging state changes

  const resolveTargetDeviceId = useCallback(() => {
    if (selectedDeviceId) return selectedDeviceId
    return devices.find((device) => device.is_active)?.id
  }, [devices, selectedDeviceId])

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      overriddenDeviceId?: string
    ) => {
      const targetDeviceId = overriddenDeviceId ?? resolveTargetDeviceId()
      if (!targetDeviceId) {
        console.warn(
          `[SpotifyControls] Command '${command}' aborted. No target device.`
        )
        return
      }
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId: targetDeviceId,
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

  // Effect: Send debounced volume command to backend
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    // We don't send the initial volume from useVolumePreference,
    // only subsequent user-initiated changes.
    if (!isDragging) {
      sendVolumeCommand(debouncedVolume)
    }
  }, [debouncedVolume, isDragging, sendVolumeCommand])

  // Effect: Reset volume lock on disconnect
  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

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
              onVolumeChange={(newVolume) => {
                setIsDragging(true)
                setVolume(newVolume)
              }}
              onVolumeChangeCommitted={() => {
                setIsDragging(false)
                // The debounced effect will handle sending the command
              }}
              onToggleMute={toggleMute}
              showValue={true}
            />
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
