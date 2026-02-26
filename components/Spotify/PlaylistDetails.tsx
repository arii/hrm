import { Box, CircularProgress, List, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'
import { SpotifyTrackItem } from './SpotifyTrackItem'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'
https://github.com/arii/hrm/pull/9379/conflict?name=components%252FSpotify%252FPlaylistDetails.tsx&ancestor_oid=bece23ba708cfe0cfde9328f1362198a15de3678&base_oid=67d618bb0ce139a5c1923f04122b23559b414949&head_oid=014ca2070caebb0b5985cf844f821d1631aeb527
const PlaylistDetails = ({
  playlistId,
  onTrackPlay,
}: {
  playlistId: string
  onTrackPlay: (uri: string, index: number) => void
}) => {
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { fetchTracks, error } = usePlaylistTracks({
    playlistId,
    limit,
  })

  const loadTracks = useCallback(
    async (currentOffset: number) => {
      const { tracks: newTracks } = await fetchTracks(currentOffset)

      setTracks((prev) =>
        currentOffset === 0 ? newTracks : [...prev, ...newTracks]
      )
      setOffset(currentOffset + newTracks.length)
      setHasMore(newTracks.length === limit)
    },
    [fetchTracks, limit]
  )

  useEffect(() => {
    // Reset and load initial tracks when playlistId changes
    setTracks([])
    setOffset(0)
    setHasMore(true)
    loadTracks(0)
  }, [playlistId, loadTracks])

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
          next={() => loadTracks(offset)}
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
                onTogglePlay={(t, i) => onTrackPlay(t.uri, i)}
              />
            ))}
          </List>
        </InfiniteScroll>
      </Paper>
    </>
  )
}

export default PlaylistDetails
