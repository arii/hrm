'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

/**
 * @component BasicControls
 * @description Provides basic playback controls for Spotify (Play, Pause, Next, Previous).
 */
export const BasicControls = () => {
  const { spotifyData, sendData } = useWebSocket()

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS'
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
    }
    sendData(message)
  }

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        size="small"
        onClick={() => sendSpotifyCommand('PREVIOUS')}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Previous track"
      >
        <SkipPreviousIcon />
      </IconButton>
      <IconButton
        size="medium"
        onClick={handlePlayPauseToggle}
        sx={{
          color: 'common.white',
          backgroundColor: 'grey.700',
          '&:hover': { backgroundColor: 'grey.600' },
        }}
        aria-label={spotifyData.isPlaying ? 'Pause' : 'Play'}
      >
        {spotifyData.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton
        size="small"
        onClick={() => sendSpotifyCommand('NEXT')}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Next track"
      >
        <SkipNextIcon />
      </IconButton>
    </Box>
  )
}