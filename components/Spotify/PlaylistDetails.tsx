// components/Spotify/PlaylistDetails.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Track } from '../../types/spotify'

interface PlaylistDetailsProps {
  playlistId: string
  onTrackPlay: (trackUri: string) => void
}

const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({
  playlistId,
  onTrackPlay,
}) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const limit = 20 // Number of tracks to fetch per request

  const fetchTracks = async (isInitialLoad = false) => {
    if (!playlistId) return
    setError(null)

    try {
      const response = await fetch(
        `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${isInitialLoad ? 0 : offset}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch playlist details')
      }
      const data = await response.json()

      if (data.tracks.length > 0) {
        setTracks(
          isInitialLoad ? data.tracks : (prev) => [...prev, ...data.tracks]
        )
        setOffset(
          isInitialLoad ? limit : (prevOffset) => prevOffset + limit
        )
      }

      if (
        isInitialLoad
          ? data.tracks.length < limit
          : tracks.length + data.tracks.length >= data.total
      ) {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to fetch playlist tracks:', err)
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      )
    }
  }

  // Effect for initial load and when playlistId changes
  useEffect(() => {
    setTracks([])
    setOffset(0)
    setHasMore(true)
    fetchTracks(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId])

  return (
    <>
      {error && (
        <Typography color="error" sx={{ p: 2 }}>
          {error}
        </Typography>
      )}
      <Paper
        id="scrollable-playlist"
      sx={{ maxHeight: '400px', overflow: 'auto', mt: 2 }}
    >
      <InfiniteScroll
        dataLength={tracks.length}
        next={fetchTracks}
        hasMore={hasMore}
        loader={
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        }
        scrollableTarget="scrollable-playlist"
      >
        <List dense>
          {tracks.map((track) => (
            <ListItem key={track.id} divider disablePadding>
              <ListItemButton onClick={() => onTrackPlay(track.uri)}>
                <MusicNote
                  sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }}
                />
                <ListItemText
                  primary={track.name}
                  secondary={`${(track.artists || []).map((a) => a.name).join(', ')} - ${track.album?.name || 'Unknown Album'}`}
                />
              </ListItemButton>
          </ListItem>
        ))}
        </List>
      </InfiniteScroll>
    </Paper>
    </>
  )
}

export default PlaylistDetails
