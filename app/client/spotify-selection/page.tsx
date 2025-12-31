// app/client/spotify-selection/page.tsx
'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'

const PlaylistSelector = dynamic(
  () => import('../../../components/Spotify/PlaylistSelector'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={200} />,
  }
)

const PlaylistDetails = dynamic(
  () => import('../../../components/Spotify/PlaylistDetails'),
  {
    ssr: false,
    loading: () => (
      <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
    ),
  }
)

const SpotifySelectionPage = () => {
  const { spotifyData, sendData } = useWebSocket()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  )

  const handlePlaylistSelected = (uri: string) => {
    const playlistId = uri.split(':').pop()
    setSelectedPlaylistId(playlistId || null)
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
            Select a Playlist to view its tracks
          </Typography>
          <PlaylistSelector
            onPlaylistSelected={handlePlaylistSelected}
            onPlaylistPlay={handlePlaylistPlay}
          />
        </CardContent>
      </Card>

      {selectedPlaylistId && (
        <PlaylistDetails playlistId={selectedPlaylistId} />
      )}
    </Container>
  )
}

export default SpotifySelectionPage
