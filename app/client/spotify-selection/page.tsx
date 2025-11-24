// app/client/spotify-selection/page.tsx
'use client'

import Pause from '@mui/icons-material/Pause'
import PlayArrow from '@mui/icons-material/PlayArrow'
import SkipNext from '@mui/icons-material/SkipNext'
import SkipPrevious from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import VolumeControl from '../../../components/Spotify/VolumeControl' // I will recreate this temporarily
import useVolumePreference from '../../../hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '../../../types/websocket'

const PlaylistSelector = dynamic(
  () => import('../../../components/Spotify/PlaylistSelector'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={200} />,
  }
)

const SpotifySelectionPage = () => {
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string | null>(
    null
  )
  interface SpotifyDevice {
    id: string
    name: string
    is_active?: boolean
  }
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  // Helper: is there an active device?
  const activeDevice = availableDevices.find((d) => d.is_active)
  const hasActiveDevice = !!activeDevice
  // Fetch available devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/spotify/devices')
        if (!response.ok) throw new Error('Failed to fetch devices')
        const devices: SpotifyDevice[] = await response.json()
        setAvailableDevices(Array.isArray(devices) ? devices : [])
      } catch (_err) {
        setAvailableDevices([])
      }
    }
    fetchDevices()
  }, [])

  // Whenever availableDevices changes, ensure selectedDeviceId is valid
  useEffect(() => {
    if (availableDevices.length > 0) {
      // If current selectedDeviceId is not in the list, or is empty, select active or first
      const found = availableDevices.find((d) => d.id === selectedDeviceId)
      if (!found) {
        const activeDevice = availableDevices.find((d) => d.is_active)
        setSelectedDeviceId(
          activeDevice ? activeDevice.id : availableDevices[0].id
        )
      }
    } else {
      setSelectedDeviceId('')
    }
  }, [availableDevices, selectedDeviceId])
  const { volume, setVolume } = useVolumePreference(70)

  const handlePlaylistSelected = (uri: string) => {
    console.log(`[SpotifySelectionPage] Playlist selected: ${uri}`)
    setSelectedPlaylistUri(uri)
  }

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'SET_VOLUME',
    options: { playlistUri?: string; volume?: number; token?: string } = {}
  ) => {
    // Always include a deviceId, fallback to active device if not set
    let deviceId = selectedDeviceId
    if (!deviceId && availableDevices.length > 0) {
      const activeDevice = availableDevices.find((d) => d.is_active)
      deviceId = activeDevice ? activeDevice.id : availableDevices[0].id
      setSelectedDeviceId(deviceId)
    }
    if (!deviceId) {
      console.warn('No deviceId available, command not sent.')
      return
    }
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      deviceId,
      ...options,
    }
    sendData(message)
  }

  const handlePlayPause = () => {
    console.log(`[SpotifySelectionPage] Play/Pause clicked. isPlaying: ${spotifyData.isPlaying}, selectedPlaylist: ${selectedPlaylistUri}`)
    if (spotifyData.isPlaying) {
      sendSpotifyCommand('PAUSE')
    } else {
      if (selectedPlaylistUri) {
        console.log(`[SpotifySelectionPage] Playing playlist: ${selectedPlaylistUri}`)
        sendSpotifyCommand('PLAY', { playlistUri: selectedPlaylistUri })
      } else {
        console.log(`[SpotifySelectionPage] Resuming playback (no playlist selected)`)
        sendSpotifyCommand('PLAY')
      }
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Spotify Playlist Selector
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
            Select a Playlist
          </Typography>
          {selectedPlaylistUri && (
            <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
              Selected: {selectedPlaylistUri.split(':').pop()} 
              {/* Show just the playlist ID for now, ideally we'd show the name */}
            </Typography>
          )}
          <PlaylistSelector onPlaylistSelected={handlePlaylistSelected} />
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack
            spacing={2}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => sendSpotifyCommand('PREVIOUS')}
                disabled={connectionStatus !== 'Connected' || !hasActiveDevice}
                startIcon={<SkipPrevious />}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                onClick={handlePlayPause}
                disabled={connectionStatus !== 'Connected' || !hasActiveDevice}
                startIcon={spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
              >
                {spotifyData.isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="contained"
                onClick={() => sendSpotifyCommand('NEXT')}
                disabled={connectionStatus !== 'Connected' || !hasActiveDevice}
                startIcon={<SkipNext />}
              >
                Next
              </Button>
            </Stack>
            <VolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onVolumeChangeCommitted={(newVolume) =>
                hasActiveDevice &&
                sendSpotifyCommand('SET_VOLUME', { volume: newVolume })
              }
            />
            {/* Device dropdown */}
            {availableDevices.length > 0 && (
              <Box sx={{ mt: 2, minWidth: 200 }}>
                <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
                  Device
                </Typography>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value)
                  }}
                  style={{ width: '100%', padding: '8px', fontSize: '1rem' }}
                >
                  {availableDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} {device.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default SpotifySelectionPage
