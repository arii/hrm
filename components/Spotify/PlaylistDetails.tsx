// components/Spotify/PlaylistDetails.tsx
import BackIcon from '@mui/icons-material/ArrowBack'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'

interface Track {
  uri: string
  name: string
  artist: string
  duration: string
}

interface PlaylistDetailsData {
  name: string
  description: string
  imageUrl: string
  tracks: Track[]
}

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
  const [details, setDetails] = useState<PlaylistDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const debouncedPlaylistUri = useDebounce(playlistUri, 300)

  useEffect(() => {
    if (!debouncedPlaylistUri) return

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const playlistId = debouncedPlaylistUri.split(':').pop()
        const response = await fetch(`/api/spotify/playlists/${playlistId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              'Playlist not found. It might be private or deleted.'
            )
          } else {
            throw new Error(
              `Failed to fetch playlist details, status: ${response.status}`
            )
          }
        }
        const data = await response.json()
        setDetails(data)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(message)
        console.error('Error fetching playlist details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [debouncedPlaylistUri])

  const handlePlayTrack = (trackUri: string) => {
    onPlaylistPlay(debouncedPlaylistUri, trackUri)
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading playlist...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
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
    <Box>
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
        {details.tracks.map((track, index) => (
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
        ))}
      </List>
    </Box>
  )
}

export default PlaylistDetails
