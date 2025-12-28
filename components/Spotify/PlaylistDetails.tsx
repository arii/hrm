// components/Spotify/PlaylistDetails.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import React, { useEffect, useState } from 'react'

interface Track {
  name: string
  uri: string
  artist: string
  album: string
  imageUrl?: string
}

interface PlaylistDetailsProps {
  playlistUri: string
  onTrackPlay: (uri: string) => void
}

const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({
  playlistUri,
  onTrackPlay,
}) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const playlistId = playlistUri.split(':').pop()

  useEffect(() => {
    if (!playlistId) return

    const fetchPlaylistDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch playlist details')
        }
        const data = await response.json()
        setTracks(data.tracks || [])
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to fetch playlist details'
        setError(message)
        console.error('Error fetching playlist details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylistDetails()
  }, [playlistId])

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading tracks...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Tracks
      </Typography>
      <List dense>
        {tracks.map((track) => (
          <ListItem
            key={track.uri}
            divider
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="play"
                onClick={() => onTrackPlay(track.uri)}
              >
                <PlayArrow />
              </IconButton>
            }
          >
            {track.imageUrl ? (
              <Box
                component="img"
                src={track.imageUrl}
                alt={track.name}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  mr: 1.5,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <MusicNote sx={{ mr: 1.5 }} />
            )}
            <ListItemText primary={track.name} secondary={track.artist} />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default PlaylistDetails
