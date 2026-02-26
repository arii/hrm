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
import { MusicNote } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { formatDuration } from '@/lib/utils'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'

const PlaylistDetails = ({
  playlistId,
  onTrackPlay,
}: {
  playlistId: string
  onTrackPlay: (uri: string) => void
}) => {
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { tracks, loading, error, hasMore, fetchTracks } = usePlaylistTracks(
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
              <ListItem
                key={`${track.id}-${index}`}
                divider
                disablePadding
                secondaryAction={
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                  >
                    {formatDuration(track.duration_ms, {
                      unit: 'milliseconds',
                      format: 'MM:SS',
                    })}
                  </Typography>
                }
              >
                <ListItemButton
                  onClick={() => onTrackPlay(track.uri)}
                  sx={{ py: 0.5, px: 1 }}
                >
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar
                      variant="rounded"
                      src={
                        track.album?.images?.[2]?.url ||
                        track.album?.images?.[0]?.url
                      }
                      sx={{ width: 32, height: 32 }}
                    >
                      <MusicNote fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={track.name}
                    secondary={`${track.artists.map((a) => a.name).join(', ')} • ${track.album.name}`}
                    primaryTypographyProps={{
                      variant: 'body2',
                      noWrap: true,
                      fontWeight: 'medium',
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      noWrap: true,
                    }}
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
