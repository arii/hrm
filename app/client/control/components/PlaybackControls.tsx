// File: app/client/control/components/PlaybackControls.tsx
/**
 * @file PlaybackControls for Spotify with touch-friendly buttons.
 * @module PlaybackControls
 */
'use client'
import Pause from '@mui/icons-material/Pause'
import PlayArrow from '@mui/icons-material/PlayArrow'
import SkipNext from '@mui/icons-material/SkipNext'
import SkipPrevious from '@mui/icons-material/SkipPrevious'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'

import { SpotifyCommand } from '@/types/websocket'

interface PlaybackControlsProps {
  isPlaying: boolean
  onCommand: (command: SpotifyCommand) => void
  disabled?: boolean
}

const PlaybackControls = ({
  isPlaying,
  onCommand,
  disabled = false,
}: PlaybackControlsProps) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="center"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <IconButton
        onClick={() => onCommand('PREVIOUS')}
        data-testid="spotify-prev"
        disabled={disabled}
        sx={{
          color: 'white',
          width: 48,
          height: 48,
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
        aria-label="Previous Track"
      >
        <SkipPrevious sx={{ fontSize: 30 }} />
      </IconButton>
      <IconButton
        onClick={() => onCommand(isPlaying ? 'PAUSE' : 'PLAY')}
        data-testid="spotify-play-pause"
        disabled={disabled}
        sx={{
          color: 'black',
          backgroundColor: 'white',
          width: 64,
          height: 64,
          '&:hover': { backgroundColor: '#f0f0f0' },
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause sx={{ fontSize: 40 }} />
        ) : (
          <PlayArrow sx={{ fontSize: 40 }} />
        )}
      </IconButton>
      <IconButton
        onClick={() => onCommand('NEXT')}
        data-testid="spotify-next"
        disabled={disabled}
        sx={{
          color: 'white',
          width: 48,
          height: 48,
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
        aria-label="Next Track"
      >
        <SkipNext sx={{ fontSize: 30 }} />
      </IconButton>
    </Stack>
  )
}

export default PlaybackControls
