// app/client/spotify-selection/page.tsx
'use client'

import { Pause, PlayArrow, SkipNext, SkipPrevious } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import PlaylistSelector from '../../../components/Spotify/PlaylistSelector'
import VolumeControl from '../../../components/Spotify/VolumeControl' // I will recreate this temporarily
import useVolumePreference from '../../../hooks/useVolumePreference'
import useWebSocket from '../../../hooks/useWebSocket'
import { SpotifyCommandMessage } from '../../../types/websocket'

const SpotifySelectionPage = () => {
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string | null>(
    null
  )
  const { volume, setVolume } = useVolumePreference(70)

  const handlePlaylistSelected = (uri: string) => {
    setSelectedPlaylistUri(uri)
  }

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'SET_VOLUME',
    options: { playlistUri?: string; volume?: number } = {}
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      ...options,
    }
    sendData(message)
  }

  const handlePlayPause = () => {
    if (spotifyData.isPlaying) {
      sendSpotifyCommand('PAUSE')
    } else {
      sendSpotifyCommand(
        'PLAY',
        selectedPlaylistUri ? { playlistUri: selectedPlaylistUri } : {}
      )
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
                disabled={connectionStatus !== 'Connected'}
                startIcon={<SkipPrevious />}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                onClick={handlePlayPause}
                disabled={connectionStatus !== 'Connected'}
                startIcon={spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
              >
                {spotifyData.isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="contained"
                onClick={() => sendSpotifyCommand('NEXT')}
                disabled={connectionStatus !== 'Connected'}
                startIcon={<SkipNext />}
              >
                Next
              </Button>
            </Stack>
            <VolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onVolumeChangeCommitted={(newVolume) =>
                sendSpotifyCommand('SET_VOLUME', { volume: newVolume })
              }
            />
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default SpotifySelectionPage
