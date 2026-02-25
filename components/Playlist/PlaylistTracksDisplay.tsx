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
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import { SpotifyTrackItem } from '../Spotify/SpotifyTrackItem'
import { formatDuration } from '@/lib/utils'

interface PlaylistTracksDisplayProps {
  playlistId: string
}

const PlaylistTracksDisplay = ({ playlistId }: PlaylistTracksDisplayProps) => {
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

  const handleTogglePlay = (
    _track: Track,
    index: number,
    isPlaying: boolean
  ) => {
    if (isPlaying) {
      executeSpotify('PAUSE')
    } else {
      executeSpotify('PLAY', {
        contextUri: `spotify:playlist:${playlistId}`,
        offset: { position: index },
      })
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

            return (
              <SpotifyTrackItem
                key={track.id}
                track={track}
                isPlaying={isPlaying}
                onClick={() => handleTogglePlay(track, index, isPlaying)}
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
                      onClick={() => handleTogglePlay(track, index, isPlaying)}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      edge="end"
                    >
                      {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                  </Box>
                }
              />
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
