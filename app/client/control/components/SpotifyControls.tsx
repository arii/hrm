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
import { useEffect, useState, useMemo } from 'react'

import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyControls } from '@/hooks/useSpotifyControls'

import PlaybackControls from '@/components/Spotify/PlaybackControls'
import VolumeControl from '@/components/Spotify/VolumeControl'
import { SpotifyCommand, SpotifyDevice } from '@/types/websocket'
import useVolumePreference from '@/hooks/useVolumePreference'

const SpotifyControls = () => {
  const router = useRouter()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { devices = [], isPlaying, shuffleState, repeatState } = spotifyData
  const { sendCommand } = useSpotifyControls()
  // State for the user's explicit device selection. Null means we should follow the active device from props.
  const [userSelectedDeviceId, setUserSelectedDeviceId] = useState<
    string | null
  >(null)
  const { volume, setVolume } = useVolumePreference()

  const activeDevice: SpotifyDevice | undefined = useMemo(
    () => devices.find((d: SpotifyDevice) => d.is_active),
    [devices]
  )

  // The device ID to display in the Select dropdown. Prioritize user's choice.
  const displayDeviceId = userSelectedDeviceId ?? activeDevice?.id ?? ''

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'

  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendCommand('GET_DEVICES')
    }
  }, [connectionStatus, sendCommand])

  // Effect to synchronize the volume from the active device prop to our local volume preference.
  useEffect(() => {
    if (
      activeDevice?.volume_percent !== undefined &&
      activeDevice.volume_percent !== volume
    ) {
      setVolume(activeDevice.volume_percent)
    }
  }, [activeDevice, volume, setVolume])

  const handleCommand = (command: SpotifyCommand, value?: unknown) => {
    switch (command) {
      case 'SET_VOLUME':
        sendCommand(command, { volume: value as number })
        break
      case 'SET_REPEAT_MODE':
        sendCommand(command, {
          repeatState: value as 'off' | 'track' | 'context',
        })
        break
      case 'TOGGLE_SHUFFLE':
        sendCommand(command, { shuffleState: value as boolean })
        break
      case 'TRANSFER_PLAYBACK':
        sendCommand(command, { deviceId: value as string })
        break
      default:
        sendCommand(command)
    }
  }

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
              isPlaying={isPlaying}
              shuffleState={shuffleState}
              repeatState={repeatState}
              onCommand={handleCommand}
              disabled={connectionStatus !== 'Connected'}
            />

            <VolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onVolumeChangeCommitted={(newVolume) =>
                handleCommand('SET_VOLUME', newVolume)
              }
            />

            {devices.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
                  Device
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={displayDeviceId}
                    onChange={(e) => {
                      const deviceId = e.target.value
                      setUserSelectedDeviceId(deviceId)
                      if (deviceId) {
                        handleCommand('TRANSFER_PLAYBACK', deviceId)
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
                    {devices.map((device: SpotifyDevice) => (
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
