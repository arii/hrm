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

  const fetchTracks = useCallback(
    async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch tracks')
        }
        const data = await response.json()
        setTracks(data.tracks)
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
    fetchTracks()
  }, [fetchTracks])

  const handlePlayTrack = (playlistUri: string, uri: string) => {
    executeSpotify('PLAY', {
      contextUri: playlistUri,
      offset: { uri },
    })
  }

  const handlePause = () => {
    executeSpotify('PAUSE')
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
              />
            )
          })}
        </List>
      </Paper>
    </Box>
  )
}

export default PlaylistTracksDisplay
