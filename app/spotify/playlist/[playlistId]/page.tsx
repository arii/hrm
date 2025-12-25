// File: app/spotify/playlist/[playlistId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useWebSocket } from '@/context/WebSocketContext'
import Image from 'next/image'

const PlaylistTracksDisplay = dynamic(
  () => import('../../../../components/Playlist/PlaylistTracksDisplay'),
  {
    ssr: false,
    loading: () => <CircularProgress />,
  }
)

const SpotifyDeviceSelectorWrapper = dynamic(
  () => import('../../../../components/SpotifyDeviceSelectorWrapper'),
  { ssr: false }
)

interface PlaylistDetails {
  id: string
  name: string
  description: string
  imageUrl: string | null
  owner: string
  trackCount: number
}

const PlaylistPage = () => {
  const params = useParams()
  const playlistId = params.playlistId as string
  useWebSocket()
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playlistId) return

    const fetchPlaylistDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/spotify/playlists/${playlistId}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.message || 'Failed to fetch playlist details'
          )
        }
        const data = await response.json()
        setPlaylist(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylistDetails()
  }, [playlistId])

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    )
  }

  if (!playlist) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Playlist not found.
        </Typography>
      </Container>
    )
  }

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {playlist.imageUrl && (
            <Image
              src={playlist.imageUrl}
              alt={playlist.name}
              width={150}
              height={150}
              style={{ marginRight: '16px' }}
            />
          )}
          <Box>
            <Typography variant="h4" component="h1">
              {playlist.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {playlist.description}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created by {playlist.owner} - {playlist.trackCount} tracks
            </Typography>
            <SpotifyDeviceSelectorWrapper />
          </Box>
        </Box>
      </Box>
      <PlaylistTracksDisplay playlistId={playlistId} />
    </Container>
  )
}

export default PlaylistPage
