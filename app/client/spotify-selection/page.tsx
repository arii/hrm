// app/client/spotify-selection/page.tsx
'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import dynamic from 'next/dynamic'
import { useWebSocket } from '@/context/WebSocketContext'
import { useEffect, useState, useCallback } from 'react'
import {
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import VolumeControl from '@/components/Spotify/VolumeControl'
import { SpotifyDevice } from '@/types/core'
import { useDebounce } from 'use-debounce'

const PlaylistSelector = dynamic(
  () => import('../../../components/Spotify/PlaylistSelector'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={200} />,
  }
)

const SpotifySelectionPage = () => {
  const { spotifyData, sendData } = useWebSocket()
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [volume, setVolume] = useState(spotifyData.volume || 100)
  const [debouncedVolume] = useDebounce(volume, 500)

  useEffect(() => {
    // Fetch available devices on mount
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/spotify/devices')
        if (response.ok) {
          const data = await response.json()
          setDevices(data.devices)
          // Auto-select the active device
          const activeDevice = data.devices.find(
            (d: SpotifyDevice) => d.is_active
          )
          if (activeDevice) {
            setSelectedDeviceId(activeDevice.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch Spotify devices:', error)
      }
    }
    fetchDevices()
  }, [])

  useEffect(() => {
    const activeDevice = spotifyData.devices.find((d) => d.is_active)
    if (activeDevice && activeDevice.id !== selectedDeviceId) {
      setSelectedDeviceId(activeDevice.id)
    }
  }, [spotifyData.devices, selectedDeviceId])

  useEffect(() => {
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      volume: debouncedVolume,
    })
  }, [debouncedVolume, sendData])

  const sendSpotifyCommand = useCallback(
    (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS', playlistUri?: string) => {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId: selectedDeviceId || undefined,
        playlistUri,
      })
    },
    [sendData, selectedDeviceId]
  )

  const handleDeviceChange = (event: SelectChangeEvent<string>) => {
    const deviceId = event.target.value
    setSelectedDeviceId(deviceId)
    // Transfer playback to the selected device
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId,
    })
  }

  const handlePlaylistPlay = (uri: string) => {
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      playlistUri: uri,
    })
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Spotify Remote
      </Typography>

      <Card>
        <CardContent>
          {spotifyData.trackName &&
          spotifyData.trackName !== 'Awaiting Login...' &&
          spotifyData.trackName !== 'Requires Login' ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6">Now Playing</Typography>
              <Typography>
                {spotifyData.trackName} - {spotifyData.artist}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mt: 1,
                }}
              >
                <IconButton onClick={() => sendSpotifyCommand('PREVIOUS')}>
                  <SkipPreviousIcon />
                </IconButton>
                <IconButton
                  onClick={() =>
                    sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')
                  }
                >
                  {spotifyData.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton onClick={() => sendSpotifyCommand('NEXT')}>
                  <SkipNextIcon />
                </IconButton>
              </Box>
              <Box sx={{ mt: 2 }}>
                <VolumeControl
                  value={volume}
                  onChange={(newValue) => setVolume(newValue as number)}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="device-select-label">Device</InputLabel>
                  <Select
                    labelId="device-select-label"
                    value={selectedDeviceId || ''}
                    label="Device"
                    onChange={handleDeviceChange}
                  >
                    {devices.map((device) => (
                      <MenuItem key={device.id} value={device.id}>
                        {device.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ textAlign: 'center' }}>
              Login to Spotify on the main dashboard to use this feature.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select a Playlist to Play
          </Typography>
          <PlaylistSelector
            onPlaylistSelected={handlePlaylistPlay}
            onPlaylistPlay={handlePlaylistPlay}
          />
        </CardContent>
      </Card>
    </Container>
  )
}

export default SpotifySelectionPage
