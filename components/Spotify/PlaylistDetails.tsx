// components/Spotify/PlaylistDetails.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { Track } from '../../types/spotify'

interface PlaylistDetailsProps {
  playlistId: string
}

const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({ playlistId }) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playlistId) return

    const fetchPlaylistDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/spotify/playlists/${playlistId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch playlist details')
        }
        const data = await response.json()
        setTracks(data.tracks ?? [])
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        {error}
      </Typography>
    )
  }

  return (
    <Paper sx={{ maxHeight: '400px', overflow: 'auto', mt: 2 }}>
      <List dense>
        {tracks.map((track) => (
          <ListItem key={track.id} divider>
            <MusicNote
              sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }}
            />
            <ListItemText
              primary={track.name}
              secondary={`${(track.artists || []).map((a) => a.name).join(', ')} - ${track.album?.name || 'Unknown Album'}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}

export default PlaylistDetails
