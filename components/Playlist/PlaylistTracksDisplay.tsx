// File: components/Playlist/PlaylistTracksDisplay.tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import { formatDuration } from '@/lib/utils'
import { SpotifyPlaylistItem } from '@/types/core'
import { getArtistNames } from '@/lib/spotify'

interface PlaylistTracksDisplayProps {
  playlistId: string
}

const PlaylistTracksDisplay = ({ playlistId }: PlaylistTracksDisplayProps) => {
  const { spotifyData } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const [tracks, setTracks] = useState<SpotifyPlaylistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchTracks = useCallback(
    async (currentOffset: number) => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${currentOffset}`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch tracks')
        }
        const data = await response.json()
        setTracks(data.tracks)
        setTotal(data.total)
        setLoading(false)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
        setLoading(false)
      }
    },
    [playlistId]
  )

  useEffect(() => {
    fetchTracks(offset)
  }, [fetchTracks, offset])

  const handlePlayTrack = (playlistUri: string, position: number) => {
    executeSpotify('PLAY', {
      contextUri: playlistUri,
      offset: { position },
    })
  }

  const handlePause = () => {
    executeSpotify('PAUSE')
  }

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit)
    }
  }

  const handlePreviousPage = () => {
    if (offset - limit >= 0) {
      setOffset(offset - limit)
    }
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

  if (tracks.length === 0) {
    return (
      <Typography variant="h6" sx={{ mt: 4 }}>
        This playlist is empty.
      </Typography>
    )
  }

  return (
    <Box>
      <Paper>
        <List dense sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
          {tracks.map((track, index) => {
            const isPlaying =
              spotifyData.playback.is_playing &&
              spotifyData.playback.track.id === track.id
            const playlistUri = `spotify:playlist:${playlistId}`
            const albumName = track.album?.name || 'Single'
            const albumThumbnail = track.album?.images?.at(-1)?.url || ''

            return (
              <ListItem
                key={track.id}
                divider
                disablePadding
                sx={{
                  backgroundColor: isPlaying ? 'action.selected' : 'inherit',
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', mr: 1 }}
                    >
                      {track.duration_ms
                        ? formatDuration(track.duration_ms, {
                            unit: 'milliseconds',
                            format: 'MM:SS',
                          })
                        : null}
                    </Typography>
                    <IconButton
                      onClick={() =>
                        isPlaying
                          ? handlePause()
                          : handlePlayTrack(playlistUri, offset + index)
                      }
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      size="small"
                    >
                      {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton
                  onClick={() =>
                    isPlaying
                      ? handlePause()
                      : handlePlayTrack(playlistUri, index)
                  }
                  sx={{ py: 0.5, px: 1 }}
                >
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar
                      variant="rounded"
                      src={albumThumbnail}
                      sx={{ width: 32, height: 32 }}
                    >
                      <MusicNoteIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={track.name}
                    secondary={`${getArtistNames(track.artists)} • ${albumName}`}
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
        <Button onClick={handlePreviousPage} disabled={offset === 0}>
          Previous
        </Button>
        <Typography>
          Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </Typography>
        <Button onClick={handleNextPage} disabled={offset + limit >= total}>
          Next
        </Button>
      </Box>
    </Box>
  )
}

export default PlaylistTracksDisplay
