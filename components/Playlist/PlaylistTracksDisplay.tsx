'use client'
import { useCallback, useEffect, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Avatar,
  Paper,
  Button,
} from '@mui/material'
import { PlayArrow, Pause, MusicNote } from '@mui/icons-material'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import { formatDuration } from '@/lib/utils'

const PlaylistTracksDisplay = ({ playlistId }: { playlistId: string }) => {
  const { spotifyData } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchTracks = useCallback(
    async (currentOffset: number) => {
      try {
        setLoading(true)
        const res = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${currentOffset}`
        )
        if (!res.ok)
          throw new Error(
            (await res.json()).message || 'Failed to fetch tracks'
          )
        const data = await res.json()
        setTracks(data.tracks)
        setTotal(data.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [playlistId]
  )

  useEffect(() => {
    fetchTracks(offset)
  }, [fetchTracks, offset])

  const handleToggle = (index: number, isPlaying: boolean) => {
    if (isPlaying) executeSpotify('PAUSE')
    else
      executeSpotify('PLAY', {
        contextUri: `spotify:playlist:${playlistId}`,
        offset: { position: offset + index },
      })
  }

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  if (error)
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    )
  if (!tracks.length)
    return (
      <Typography variant="h6" sx={{ mt: 4 }}>
        This playlist is empty.
      </Typography>
    )

  return (
    <Box>
      <Paper>
        <List dense sx={{ p: 0 }}>
          {tracks.map((track, index) => {
            const isPlaying =
              spotifyData.playback.is_playing &&
              spotifyData.playback.track.id === track.id
            return (
              <ListItem
                key={`${track.id}-${index}`}
                divider
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', mr: 2 }}
                    >
                      {formatDuration(track.duration_ms, {
                        unit: 'milliseconds',
                        format: 'MM:SS',
                      })}
                    </Typography>
                    <IconButton
                      onClick={() => handleToggle(index, isPlaying)}
                      edge="end"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                  </Box>
                }
                sx={{
                  backgroundColor: isPlaying ? 'action.selected' : 'inherit',
                }}
              >
                <ListItemButton
                  onClick={() => handleToggle(index, isPlaying)}
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
            )
          })}
        </List>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          onClick={() => setOffset(offset - limit)}
          disabled={offset === 0}
        >
          Previous
        </Button>
        <Typography>
          Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </Typography>
        <Button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
        >
          Next
        </Button>
      </Box>
    </Box>
  )
}

export default PlaylistTracksDisplay
