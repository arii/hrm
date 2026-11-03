// components/Spotify/PlaylistDetails.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import { withBasePath } from '@/utils/urls'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === 'AbortError'

// Payload shape of GET /api/spotify/playlists/[playlistId]/tracks.
interface Track {
  id: string
  name: string
  artists: string
  album: string | null
  albumArt: string | null
  duration: number
  uri: string
}

interface PlaylistDetailsProps {
  playlistId: string
  onTrackPlay: (index: number) => void
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
  // Supersedes in-flight fetches (playlist switch, fast scroll) and aborts
  // on unmount so navigation never resolves stale state.
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const startFetch = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller.signal
  }, [])

  // Shared page fetch for initial load + infinite scroll. Returns the
  // tracks, or null when aborted/failed (error state already set).
  const fetchTracksPage = useCallback(
    async (fetchOffset: number): Promise<Track[] | null> => {
      try {
        const response = await fetch(
          withBasePath(
            `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${fetchOffset}`
          ),
          { signal: startFetch() }
        )
        if (!response.ok) {
          throw new Error('Failed to fetch playlist details')
        }
        const data = await response.json()
        return data.tracks
      } catch (err) {
        if (isAbort(err)) return null
        console.error('Failed to fetch playlist tracks:', err)
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
        return null
      }
    },
    [playlistId, limit, startFetch]
  )

  const fetchMoreTracks = useCallback(async () => {
    if (!playlistId) return
    setError(null)

    const page = await fetchTracksPage(offset)
    if (!page) return
    setTracks((prev) => [...prev, ...page])
    setOffset((prev) => prev + page.length)
    setHasMore(page.length === limit)
  }, [playlistId, offset, limit, fetchTracksPage])

  useEffect(() => {
    const fetchInitialTracks = async () => {
      if (!playlistId) return
      setTracks([])
      setOffset(0)
      setHasMore(true)
      setError(null)

      const page = await fetchTracksPage(0)
      if (!page) return
      setTracks(page)
      setOffset(page.length)
      setHasMore(page.length === limit)
    }

    fetchInitialTracks()
  }, [playlistId, limit, fetchTracksPage])

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
          <List dense>
            {tracks.map((track, index) => (
              <ListItem key={`${track.id}-${index}`} divider disablePadding>
                <ListItemButton onClick={() => onTrackPlay(index)}>
                  {track.albumArt ? (
                    <Box
                      component="img"
                      src={track.albumArt}
                      alt=""
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        mr: 1.5,
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <MusicNote
                      sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }}
                    />
                  )}
                  <ListItemText
                    primary={track.name}
                    secondary={`${track.artists} - ${track.album || 'Unknown Album'}`}
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
