// File: components/Playlist/PlaylistTracksDisplay.tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
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
import Button from '@mui/material/Button'
import { formatDuration } from '@/utils/formatters'
import Image from 'next/image'

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
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Play</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Artist</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracks.map((track) => {
              const isPlaying =
                spotifyData.isPlaying && spotifyData.trackName === track.name
              return (
                <TableRow
                  key={track.id}
                  sx={{
                    backgroundColor: isPlaying ? 'action.selected' : 'inherit',
                  }}
                >
                  <TableCell>
                    <IconButton
                      onClick={() =>
                        isPlaying ? handlePause() : handlePlayTrack(track.uri)
                      }
                    >
                      {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
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
                  <TableCell>{track.artists}</TableCell>
                  <TableCell>{formatDuration(track.duration)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
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
