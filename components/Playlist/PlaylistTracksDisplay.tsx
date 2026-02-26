'use client'
import { useEffect, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  Paper,
  Button,
} from '@mui/material'
import { SpotifyTrackItem } from '../Spotify/SpotifyTrackItem'

const PlaylistTracksDisplay = ({ playlistId }: { playlistId: string }) => {
  const { spotifyData } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { tracks, loading, error, total, fetchTracks } = usePlaylistTracks(
    playlistId,
    { limit }
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
              <SpotifyTrackItem
                key={`${track.id}-${index}`}
                track={track}
                index={index}
                isPlaying={isPlaying}
                onTogglePlay={(_, i) => handleToggle(i, isPlaying)}
                showPlaybackControls
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
