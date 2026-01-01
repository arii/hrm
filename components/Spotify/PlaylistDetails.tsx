// components/Spotify/PlaylistDetails.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { Track } from '../../types/spotify'

interface PlaylistDetailsProps {
  tracks: Track[]
  isLoading: boolean
  error?: string | null
}

const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({
  tracks,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <Typography>Loading tracks...</Typography>
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

  if (tracks.length === 0) {
    return (
      <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        Select a playlist to see its tracks.
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
