'use client'

import { Container, Typography, Box } from '@mui/material'
import PlaylistTracksDisplay from '@/components/Spotify/PlaylistTracksDisplay'
import { useParams } from 'next/navigation'

const PlaylistPage = () => {
  const params = useParams()
  const playlistId = params.playlistId as string

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Playlist Tracks
        </Typography>
        {playlistId ? (
          <PlaylistTracksDisplay playlistId={playlistId} />
        ) : (
          <Typography>Loading playlist...</Typography>
        )}
      </Box>
    </Container>
  )
}

export default PlaylistPage
