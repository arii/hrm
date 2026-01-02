// File: components/Playlist/PlaylistTracksDisplay.tsx
'use client'
import { useCallback, useEffect, useState, CSSProperties } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { formatDuration } from '@/utils/formatters'
import Image from 'next/image'
import { FixedSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import AutoSizer from 'react-virtualized-auto-sizer'

interface Track {
  id: string
  name: string
  artists: string
  albumArt: string | null
  duration: number
  uri: string
}

interface PlaylistTracksDisplayProps {
  playlistId: string
}

const PlaylistTracksDisplay = ({ playlistId }: PlaylistTracksDisplayProps) => {
  const { spotifyData, sendData } = useWebSocket()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [isNextPageLoading, setNextPageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(true)
  const limit = 50

  const loadMoreItems = useCallback(
    async (startIndex: number) => {
      if (isNextPageLoading || !hasNextPage) return
      setNextPageLoading(true)
      try {
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${startIndex}`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch tracks')
        }
        const data = await response.json()
        setTracks((prevTracks) => [...prevTracks, ...data.tracks])
        setHasNextPage(tracks.length + data.tracks.length < data.total)
        setError(null) // Clear previous errors on success
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
      } finally {
        setNextPageLoading(false)
      }
    },
    [
      playlistId,
      isNextPageLoading,
      hasNextPage,
      limit,
      tracks.length,
    ]
  )

  useEffect(() => {
    setTracks([])
    setTotal(0)
    setHasNextPage(true)
    setLoading(true)
    setError(null)

    const fetchInitialTracks = async () => {
      setNextPageLoading(true)
      try {
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=0`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch tracks')
        }
        const data = await response.json()
        setTracks(data.tracks)
        setTotal(data.total)
        setHasNextPage(data.tracks.length < data.total)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
      } finally {
        setNextPageLoading(false)
        setLoading(false)
      }
    }

    fetchInitialTracks()
  }, [playlistId, limit])

  const handlePlayTrack = (trackUri: string) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      playlistUri: trackUri,
    }
    sendData(message)
  }

  const handlePause = () => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'PAUSE',
    }
    sendData(message)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    )
  }

  if (tracks.length === 0 && !loading) {
    return (
      <Typography variant="h6" sx={{ mt: 4 }}>
        This playlist is empty.
      </Typography>
    )
  }

  const itemCount = hasNextPage ? tracks.length + 1 : tracks.length
  const isItemLoaded = (index: number) => !hasNextPage || index < tracks.length

  const Row = ({
    index,
    style,
  }: {
    index: number
    style: CSSProperties
  }) => {
    if (!isItemLoaded(index)) {
      return (
        <TableRow
          style={style}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
          component="div"
        >
          <TableCell component="div">
            <CircularProgress size={24} />
          </TableCell>
        </TableRow>
      )
    }

    const track = tracks[index]
    if (!track) {
      return null
    }
    const isPlaying =
      spotifyData.isPlaying && spotifyData.trackId === track.id

    return (
      <TableRow
        style={style}
        key={track.id}
        sx={{
          backgroundColor: isPlaying ? 'action.selected' : 'inherit',
          display: 'flex',
          width: '100%',
        }}
        component="div"
      >
        <TableCell
          sx={{ flex: '0 0 72px', display: 'flex', alignItems: 'center' }}
          component="div"
        >
          <IconButton
            onClick={() =>
              isPlaying ? handlePause() : handlePlayTrack(track.uri)
            }
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </TableCell>
        <TableCell
          sx={{ flex: '1 1 50%', display: 'flex', alignItems: 'center' }}
          component="div"
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {track.albumArt && (
              <Image
                src={track.albumArt}
                alt={track.name}
                width={40}
                height={40}
                style={{ marginRight: '8px' }}
              />
            )}
            {track.name}
          </Box>
        </TableCell>
        <TableCell
          sx={{ flex: '1 1 30%', display: 'flex', alignItems: 'center' }}
          component="div"
        >
          {track.artists}
        </TableCell>
        <TableCell
          sx={{ flex: '1 1 20%', display: 'flex', alignItems: 'center' }}
          component="div"
        >
          {formatDuration(track.duration)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0 }}>
      <TableContainer component={Paper} sx={{ height: '100%' }}>
        <Table component="div" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <TableHead component="div">
            <TableRow
              sx={{ display: 'flex', width: '100%' }}
              component="div"
            >
              <TableCell sx={{ flex: '0 0 72px' }} component="div">
                Play
              </TableCell>
              <TableCell sx={{ flex: '1 1 50%' }} component="div">
                Title
              </TableCell>
              <TableCell sx={{ flex: '1 1 30%' }} component="div">
                Artist
              </TableCell>
              <TableCell sx={{ flex: '1 1 20%' }} component="div">
                Duration
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody component="div" sx={{ flex: 1 }}>
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={total}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      height={height}
                      itemCount={itemCount}
                      itemSize={56}
                      width={width}
                      onItemsRendered={onItemsRendered}
                      ref={ref}
                    >
                      {Row}
                    </List>
                  )}
                </AutoSizer>
              )}
            </InfiniteLoader>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default PlaylistTracksDisplay