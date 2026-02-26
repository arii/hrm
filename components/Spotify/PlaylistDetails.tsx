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
import { useCallback, useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import { formatDuration } from '@/lib/utils'

const PlaylistDetails = ({
  playlistId,
  onTrackPlay,
}: {
  playlistId: string
  onTrackPlay: (uri: string) => void
}) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const limit = 20

  const fetchTracks = useCallback(
    async (currentOffset: number) => {
      if (!playlistId) return
      try {
        const res = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${currentOffset}`
        )
        if (!res.ok) throw new Error('Failed to fetch tracks')
        const data = await res.json()
        setTracks((prev) =>
          currentOffset === 0 ? data.tracks : [...prev, ...data.tracks]
        )
        setOffset(currentOffset + data.tracks.length)
        setHasMore(data.tracks.length === limit)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    },
    [playlistId]
  )

  useEffect(() => {
    fetchTracks(0)
  }, [playlistId, fetchTracks])

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
          next={() => fetchTracks(offset)}
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
                      src={track.album?.images?.[2]?.url}
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
