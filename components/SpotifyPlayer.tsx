// File: components/SpotifyPlayer.tsx
'use client'
import {
  Box,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Pause,
  PlayArrow,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  Speaker as SpeakerIcon,
} from '@mui/icons-material'
import { useEffect, useState, useCallback, useRef } from 'react'
import useWebSocket from '@/hooks/useWebSocket'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
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

interface SpotifyPlayerProps {
  isMobileLayout?: boolean
  showDeviceSelector?: boolean
  showVolumeControl?: boolean
}

const SpotifyPlayer = ({
  isMobileLayout = false,
  showDeviceSelector = true,
  showVolumeControl = true,
}: SpotifyPlayerProps) => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(null)
  const deviceMenuOpen = Boolean(deviceMenuAnchor)

  useEffect(() => {
    if (spotifyData.isPlaying && spotifyData.progressMs && spotifyData.durationMs) {
      const { durationMs, progressMs } = spotifyData
      const start = Date.now() - progressMs
      const timer = setInterval(() => {
        const elapsed = Date.now() - start
        const newProgress = (elapsed / durationMs) * 100
        setProgress(newProgress > 100 ? 100 : newProgress)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [spotifyData])

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
    targetDeviceId?: string
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      ...(targetDeviceId && { deviceId: targetDeviceId }),
    }
    sendData(message)
  }

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const sanitized = clampVolume(value)
      const targetDeviceId =
        selectedDeviceId ||
        availableDevices.find((device) => device.is_active)?.id
      const messageKey = `${targetDeviceId ?? 'default'}:${sanitized}`
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
    [availableDevices, connectionStatus, selectedDeviceId, sendData]
  )

  useEffect(() => {
    if (spotifyData.trackName) {
      const fetchDevices = async () => {
        try {
          const response = await fetch('/api/spotify/devices')
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const devices = await response.json()
          const deviceArray = Array.isArray(devices) ? devices : []
          setAvailableDevices(deviceArray)
        } catch (error) {
          console.error('[SpotifyPlayer] Failed to fetch Spotify devices:', error)
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
    }
  }, [spotifyData.trackName])

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

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
    setDeviceMenuAnchor(null)
  }

  return (
    <Box
      aria-label={`Now playing: ${spotifyData.trackName} by ${spotifyData.artist}`}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 3,
        height: isMobileLayout ? 'auto' : '150px',
      }}
    >
      {spotifyData.albumArtUrl && (
        <Box
          component="img"
          src={spotifyData.albumArtUrl}
          sx={{
            filter: 'blur(20px)',
            position: 'absolute',
            zIndex: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      <Stack
        sx={{
          zIndex: 1,
          position: 'relative',
          bgcolor: 'rgba(0,0,0,0.6)',
          p: 2,
          height: '100%',
          flexDirection: isMobileLayout ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {spotifyData.albumArtUrl && (
            <Box
              component="img"
              src={spotifyData.albumArtUrl}
              alt="Album Art"
              sx={{
                width: isMobileLayout ? 80 : 100,
                height: isMobileLayout ? 80 : 100,
                borderRadius: 1,
              }}
            />
          )}
          <Box>
            <Typography variant="h6" color="common.white">
              {spotifyData.trackName}
            </Typography>
            <Typography variant="subtitle1" color="grey.400">
              {spotifyData.artist}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mt: isMobileLayout ? 2 : 0 }}
        >
          <IconButton
            onClick={() => sendSpotifyCommand('PREVIOUS')}
            sx={{ color: 'common.white' }}
          >
            <SkipPrevious />
          </IconButton>
          <IconButton
            onClick={handlePlayPauseToggle}
            sx={{
              color: 'common.white',
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton
            onClick={() => sendSpotifyCommand('NEXT')}
            sx={{ color: 'common.white' }}
          >
            <SkipNext />
          </IconButton>
        </Stack>
        {showVolumeControl && (
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
          </Stack>
        )}
        {showDeviceSelector && (
          <>
            <IconButton
              size="small"
              onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
              sx={{
                color: 'common.white',
                '&:hover': { backgroundColor: 'grey.800' },
              }}
              aria-label="Select playback device"
            >
              <SpeakerIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={deviceMenuAnchor}
              open={deviceMenuOpen}
              onClose={() => setDeviceMenuAnchor(null)}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
            >
              {availableDevices.length > 0 ? (
                availableDevices.map((device) => (
                  <MenuItem
                    key={device.id}
                    onClick={() => handleDeviceSelect(device.id)}
                    selected={device.is_active}
                  >
                    {device.name} {device.is_active && '✓'}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No devices available</MenuItem>
              )}
            </Menu>
          </>
        )}
      </Stack>
      {typeof spotifyData.durationMs === 'number' && spotifyData.durationMs > 0 && (
        <LinearProgress
          variant="determinate"
          value={progress}
          color="success"
          sx={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            zIndex: 2,
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#1DB954',
            },
          }}
        />
      )}
    </Box>
  )
}

export default SpotifyPlayer
