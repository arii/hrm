'use client'

import React,  { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  IconButton,
  Box,
  Avatar,
  Button,
  TableFooter,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import { Alert } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'
import { Track } from '@/types'

interface PlaylistTracksDisplayProps {
  playlistId: string
}

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}:${seconds.padStart(2, '0')}`
}

const usePlaylistTracks = (playlistId: string, limit = 20) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number>(0)
  const [offset, setOffset] = useState<number>(0)

  useEffect(() => {
    if (!playlistId) return

    const fetchTracks = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}?limit=${limit}&offset=${offset}`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch playlist tracks')
        }
        const data = await response.json()
        setTracks(data.tracks)
        setTotal(data.total)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTracks()
  }, [playlistId, offset, limit])

  const nextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const prevPage = () => {
    if (offset - limit >= 0) {
      setOffset(offset - limit);
    }
  };

  return { tracks, total, loading, error, offset, limit, nextPage, prevPage }
}

const PlaylistTracksDisplay: React.FC<PlaylistTracksDisplayProps> = ({
  playlistId,
}) => {
  const { tracks, total, loading, error, offset, limit, nextPage, prevPage } = usePlaylistTracks(playlistId)
  const { spotifyData } = useWebSocket()

  const isPlaying = spotifyData?.isPlaying ?? false
  const currentTrackUri = spotifyData?.item?.uri

  const handlePlay = useCallback(async (trackUri: string) => {
    try {
      const response = await fetch('/api/spotify/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'PLAY',
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { uri: trackUri },
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to play track')
      }
    } catch (err: any) {
      console.error('Playback error:', err.message)
    }
  }, [playlistId])

  const handlePause = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: 'PAUSE' }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to pause track')
      }
    } catch (err: any) {
      console.error('Playback error:', err.message)
    }
  }, [])

  const paginationInfo = useMemo(() => {
    const start = total > 0 ? offset + 1 : 0;
    const end = Math.min(offset + limit, total);
    return `Showing ${start}-${end} of ${total}`;
  }, [offset, limit, total]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" my={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        <Typography>{error}</Typography>
      </Alert>
    )
  }

  if (tracks.length === 0) {
    return (
      <Typography variant="subtitle1" align="center" my={4}>
        This playlist is empty.
      </Typography>
    )
  }

  return (
    <TableContainer component={Paper} elevation={3}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '5%' }}>#</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Album</TableCell>
            <TableCell>Duration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tracks.map((track) => {
            const isCurrentlyPlaying = currentTrackUri === track.uri && isPlaying
            return (
            <TableRow
              key={track.uri}
              hover
              selected={isCurrentlyPlaying}
            >
              <TableCell>
                <IconButton
                  size="small"
                  aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
                  onClick={() =>
                    isCurrentlyPlaying
                      ? handlePause()
                      : handlePlay(track.uri)
                  }
                >
                  {isCurrentlyPlaying ? (
                    <PauseIcon />
                  ) : (
                    <PlayArrowIcon />
                  )}
                </IconButton>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <Avatar
                    src={track.albumImageUrl || undefined}
                    variant="square"
                    sx={{ width: 40, height: 40, mr: 2 }}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: isCurrentlyPlaying ? 'bold' : 'normal', color: isCurrentlyPlaying ? 'primary.main' : 'inherit' }}>
                      {track.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {track.artists}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{track.albumName}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDuration(track.durationMs)}
                </Typography>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption">{paginationInfo}</Typography>
                <Box>
                  <Button onClick={prevPage} disabled={offset === 0}>
                    Previous
                  </Button>
                  <Button onClick={nextPage} disabled={offset + limit >= total}>
                    Next
                  </Button>
                </Box>
              </Box>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  )
}

export default PlaylistTracksDisplay
