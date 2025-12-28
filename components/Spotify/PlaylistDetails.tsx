// components/Spotify/PlaylistDetails.tsx
import BackIcon from '@mui/icons-material/ArrowBack'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Image from 'next/image'
import { useState } from 'react'
import { usePlaylistDetails } from '@/hooks/usePlaylistDetails'
import { Track } from '@/types/spotify'

interface PlaylistDetailsProps {
  playlistUri: string
  onBack: () => void
  onPlaylistPlay: (uri: string, trackUri?: string) => void
}

const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({
  playlistUri,
  onBack,
  onPlaylistPlay,
}) => {
  const { data: details, loading, error } = usePlaylistDetails(playlistUri)
  const [imageLoading, setImageLoading] = useState(true)

  const handlePlayTrack = (trackUri: string) => {
    onPlaylistPlay(playlistUri, trackUri)
  }

  if (loading) {
    return (
      <Box aria-live="polite">
        <Button startIcon={<BackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Playlists
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton
            variant="rectangular"
            width={100}
            height={100}
            sx={{ borderRadius: 1, mr: 2 }}
          />
          <Box>
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={150} height={20} />
          </Box>
        </Box>
        <List>
          {[...Array(5)].map((_, i) => (
            <ListItem key={i} divider>
              <ListItemText
                primary={<Skeleton variant="text" width="60%" />}
                secondary={<Skeleton variant="text" width="40%" />}
              />
              <IconButton edge="end" disabled>
                <PlayArrow />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Box>
    )
  }

  if (error) {
    return (
      <Box aria-live="polite">
        <Button startIcon={<BackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Playlists
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!details) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Playlists
        </Button>
        <Typography>No details found for this playlist.</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        opacity: !loading ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      <Button startIcon={<BackIcon />} onClick={onBack} sx={{ mb: 2 }}>
        Back to Playlists
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {details.imageUrl && (
          <>
            {imageLoading && (
              <Skeleton
                variant="rectangular"
                width={100}
                height={100}
                sx={{ borderRadius: 1, mr: 2 }}
              />
            )}
            <Image
              src={details.imageUrl}
              alt={details.name}
              width={100}
              height={100}
              style={{
                borderRadius: 8,
                marginRight: 16,
                display: imageLoading ? 'none' : 'block',
              }}
              onLoad={() => setImageLoading(false)}
            />
          </>
        )}
        <Box>
          <Typography variant="h5" component="h2">
            {details.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {details.description}
          </Typography>
        </Box>
      </Box>
      <List>
        {details.tracks && details.tracks.length > 0 ? (
          details.tracks.map((track: Track, index: number) => (
            <ListItem key={track.uri} divider>
              <ListItemText
                primary={`${index + 1}. ${track.name}`}
                secondary={`${track.artist} • ${track.duration}`}
              />
              <IconButton
                edge="end"
                aria-label={`Play ${track.name}`}
                onClick={() => handlePlayTrack(track.uri)}
              >
                <PlayArrow />
              </IconButton>
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="This playlist is empty." />
          </ListItem>
        )}
      </List>
    </Box>
  )
}

export default PlaylistDetails
