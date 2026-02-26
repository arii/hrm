'use client'
import { useEffect, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'
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

const PlaylistTracksDisplay = ({ playlistId }: { playlistId: string }) => {
  const { spotifyData } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const [tracks, setTracks] = useState<Track[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const limit = 20

  const { fetchTracks, loading, error } = usePlaylistTracks({
    playlistId,
    limit,
  })

  useEffect(() => {
    let mounted = true
    fetchTracks(offset).then((data) => {
      if (mounted) {
        setTracks(data.tracks)
        setTotal(data.total)
        setIsInitialLoad(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [fetchTracks, offset])

  const handleToggle = (index: number, isPlaying: boolean) => {
    if (isPlaying) executeSpotify('PAUSE')
    else
      executeSpotify('PLAY', {
        contextUri: `spotify:playlist:${playlistId}`,
        offset: { position: offset + index },
      })
  }

  if ((loading || isInitialLoad) && tracks.length === 0) {
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
  }

  if (!loading && !isInitialLoad && tracks.length === 0) {
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
          disabled={offset === 0 || loading}
        >
          Previous
        </Button>
        <Typography>
          Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </Typography>
        <Button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total || loading}
        >
          Next
        </Button>
      </Box>
    </Box>
  )
}

export default PlaylistTracksDisplay
