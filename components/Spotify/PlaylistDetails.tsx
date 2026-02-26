import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Avatar,
  Paper,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'
import { SpotifyTrackItem } from './SpotifyTrackItem'

const PlaylistDetails = ({
  playlistId,
  onTrackPlay,
}: {
  playlistId: string
  onTrackPlay: (uri: string, index: number) => void
}) => {
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { tracks, error, hasMore, fetchTracks } = usePlaylistTracks(
    playlistId,
    { limit, mode: 'append' }
  )

  useEffect(() => {
    fetchTracks(0)
  }, [playlistId, fetchTracks])

  const handleLoadMore = () => {
    const nextOffset = offset + tracks.length
    setOffset(nextOffset)
    fetchTracks(nextOffset)
  }

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
          next={handleLoadMore}
          hasMore={hasMore}
          loader={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          }
          scrollableTarget="scrollable-playlist"
        >
          <List dense sx={{ p: 0 }}>
            {tracks.map((track, index) => (
              <SpotifyTrackItem
                key={`${track.id}-${index}`}
                track={track}
                index={index}
                onTogglePlay={() => onTrackPlay(track.uri, index)}
              />
            ))}
          </List>
        </InfiniteScroll>
      </Paper>
    </>
  )
}

export default PlaylistDetails
