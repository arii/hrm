// components/Spotify/PlaylistDetails.tsx
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { SpotifyPlaylistItem as Track } from '../../types/core'
import { TrackListItem } from './TrackListItem'

interface PlaylistDetailsProps {
  playlistId: string
  onTrackPlay: (uri: string) => void
}

const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({
  playlistId,
  onTrackPlay,
}) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const limit = 20

  const fetchMoreTracks = useCallback(async () => {
    if (!playlistId) return
    setError(null)

    try {
      const response = await fetch(
        `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch playlist details')
      }
      const data = await response.json()

      setTracks((prev) => [...prev, ...data.tracks])
      setOffset((prev) => prev + data.tracks.length)
      setHasMore(data.tracks.length === limit)
    } catch (err) {
      console.error('Failed to fetch playlist tracks:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    }
  }, [playlistId, offset, limit])

  useEffect(() => {
    const fetchInitialTracks = async () => {
      if (!playlistId) return
      setTracks([])
      setOffset(0)
      setHasMore(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=0`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch playlist details')
        }
        const data = await response.json()
        setTracks(data.tracks)
        setOffset(data.tracks.length)
        setHasMore(data.tracks.length === limit)
      } catch (err) {
        console.error('Failed to fetch playlist tracks:', err)
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
      }
    }

    fetchInitialTracks()
  }, [playlistId, limit])

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
          next={fetchMoreTracks}
          hasMore={hasMore}
          loader={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          }
          scrollableTarget="scrollable-playlist"
        >
          <List dense sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
            {tracks.map((track, index) => (
              <TrackListItem
                key={`${track.id}-${index}`}
                track={track}
                onClick={() => onTrackPlay(track.uri)}
              />
            ))}
          </List>
        </InfiniteScroll>
      </Paper>
    </>
  )
}

export default PlaylistDetails
