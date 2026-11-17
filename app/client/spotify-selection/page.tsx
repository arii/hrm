// app/client/spotify-selection/page.tsx
'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useSpotifyData } from '@/context/WebSocketContext'
import {
  useSpotifyCommand,
  SpotifyPlayPayload,
} from '@/hooks/useSpotifyCommand'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { FOOTER_RESERVE_RESPONSIVE } from '@/constants/layout'

const PlaylistQuickGrid = dynamic(
  () => import('../../../components/Spotify/PlaylistQuickGrid'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={200} />,
  }
)

const SpotifyQuickSettings = dynamic(
  () => import('../../../components/Spotify/SpotifyQuickSettings'),
  { ssr: false }
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
  const spotifyData = useSpotifyData()
  const {
    execute: executeSpotify,
    activeDevice,
    hrmPlayer,
  } = useSpotifyCommand()
  const { showWarning } = useAppSnackbar()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  )

  const handleShowTracks = (uri: string) => {
    const playlistId = uri.split(':').pop() || null
    setSelectedPlaylistId((open) => (open === playlistId ? null : playlistId))
  }

  const playOnTarget = (payload: SpotifyPlayPayload): void => {
    const targetDeviceId = activeDevice?.id || hrmPlayer?.id || null
    if (!targetDeviceId) {
      showWarning(
        'No Spotify device available. Open the dashboard to start the web player.'
      )
      return
    }
    executeSpotify('PLAY', { ...payload, deviceId: targetDeviceId })
  }

  const trackName = spotifyData.playback.track.name
  const isLoggedIn =
    !!trackName &&
    trackName !== 'Awaiting Login...' &&
    trackName !== 'Requires Login'

  const tracksRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selectedPlaylistId) {
      tracksRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [selectedPlaylistId])

  const handlePlaylistPlay = (uri: string) => {
    playOnTarget({ contextUri: uri })
  }

  const handleTrackPlay = (index: number) => {
    if (selectedPlaylistId) {
      playOnTarget({
        contextUri: `spotify:playlist:${selectedPlaylistId}`,
        offset: { position: index },
      })
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 3, pb: FOOTER_RESERVE_RESPONSIVE }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Spotify Playlist Selector
      </Typography>

      <Card>
        <CardContent>
          {isLoggedIn ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6">Now Playing</Typography>
              <Typography>
                {spotifyData.playback.track.name} -{' '}
                {spotifyData.playback.track.artist}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ textAlign: 'center' }}>
              Login to Spotify on the main dashboard to use this feature.
            </Typography>
          )}
        </CardContent>
      </Card>

      {isLoggedIn && (
        <Box sx={{ mt: 2 }}>
          <SpotifyQuickSettings />
        </Box>
      )}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tap a playlist to play it
          </Typography>
          <PlaylistQuickGrid
            onPlaylistPlay={handlePlaylistPlay}
            onShowTracks={handleShowTracks}
            openUri={
              selectedPlaylistId
                ? `spotify:playlist:${selectedPlaylistId}`
                : null
            }
          />
        </CardContent>
      </Card>

      <Box ref={tracksRef} sx={{ scrollMarginTop: 16 }}>
        {selectedPlaylistId && (
          <PlaylistDetails
            playlistId={selectedPlaylistId}
            onTrackPlay={handleTrackPlay}
          />
        )}
      </Box>
    </Container>
  )
}

export default SpotifySelectionPage
