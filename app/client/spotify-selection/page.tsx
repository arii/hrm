// app/client/spotify-selection/page.tsx
'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import ErrorBoundary from '../../../components/ErrorBoundary'

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
    loading: () => <Skeleton variant="rectangular" height={400} />,
  }
)

const SpotifySelectionPage = () => {
  const { spotifyData, sendData } = useWebSocket()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlaylistUri = searchParams.get('playlist')

  const handlePlaylistSelected = (uri: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('playlist', uri)
    router.push(`?${params.toString()}`)
  }

  const handleBack = () => {
    router.push('/')
  }

  const handlePlaylistPlay = (uri: string, trackUri?: string) => {
    const activeDevice = spotifyData.devices?.find((device) => device.is_active)
    const command: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
    }
    if (trackUri) {
      command.uri = trackUri
    } else {
      command.contextUri = uri
    }
    if (activeDevice) {
      command.deviceId = activeDevice.id
    }
    sendData(command)
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
          {selectedPlaylistUri ? (
            <ErrorBoundary>
              <PlaylistDetails
                key={selectedPlaylistUri}
                playlistUri={selectedPlaylistUri}
                onBack={handleBack}
                onPlaylistPlay={handlePlaylistPlay}
              />
            </ErrorBoundary>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Select a Playlist to view its tracks
              </Typography>
              <PlaylistSelector
                onPlaylistSelected={handlePlaylistSelected}
                onPlaylistPlay={handlePlaylistPlay}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}

const SpotifySelectionPageWithSuspense = () => (
  <Suspense fallback={<Skeleton variant="rectangular" height={600} />}>
    <SpotifySelectionPage />
  </Suspense>
)

export default SpotifySelectionPageWithSuspense
