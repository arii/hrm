import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import { SpotifyTrackItem } from './SpotifyTrackItem'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'

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
    // Load initial tracks when playlistId changes.
    // We avoid synchronously resetting state here to prevent 'set-state-in-effect' linter errors.
    // loadTracks(0) will replace the tracks list once the data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTracks(0)
  }, [playlistId, loadTracks])

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
          <List dense sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
            {tracks.map((track, index) => (
              <SpotifyTrackItem
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
