// File: components/Playlist/PlaylistTracksDisplay.tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import List from '@mui/material/List'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import { formatDuration } from '@/lib/utils'
import { SpotifyPlaylistItem } from '@/types/core'
import { TrackListItem } from '../Spotify/TrackListItem'

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

  const handlePlayTrack = (playlistUri: string, uri: string) => {
    executeSpotify('PLAY', {
      contextUri: playlistUri,
      offset: { uri },
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
          {tracks.map((track) => {
            const isPlaying =
              spotifyData.playback.is_playing &&
              spotifyData.playback.track.id === track.id
            const playlistUri = `spotify:playlist:${playlistId}`

            return (
              <TrackListItem
                key={track.id}
                track={track}
                isSelected={isPlaying}
                onClick={() =>
                  isPlaying
                    ? handlePause()
                    : handlePlayTrack(playlistUri, track.uri)
                }
                secondaryAction={
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mr: 1 }}
                  >
                    {!!track.duration_ms &&
                      formatDuration(track.duration_ms, {
                        unit: 'milliseconds',
                        format: 'MM:SS',
                      })}
                  </Typography>
                }
              />
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
