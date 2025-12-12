// components/Spotify/PlaybackControls.tsx
import React from 'react'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Pause from '@mui/icons-material/Pause'
import SkipNext from '@mui/icons-material/SkipNext'
import SkipPrevious from '@mui/icons-material/SkipPrevious'
import Shuffle from '@mui/icons-material/Shuffle'
import Repeat from '@mui/icons-material/Repeat'
import RepeatOne from '@mui/icons-material/RepeatOne'
import { SpotifyCommand, SpotifyRepeatState } from '@/types/websocket'

interface PlaybackControlsProps {
  isPlaying: boolean
  shuffleState: boolean
  repeatState: SpotifyRepeatState
  onCommand: (
    command: SpotifyCommand,
    value?: string | number | boolean
  ) => void
  disabled?: boolean
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  shuffleState,
  repeatState,
  onCommand,
  disabled = false,
}) => {
  const handleRepeatClick = () => {
    let nextState: SpotifyRepeatState = 'off'
    if (repeatState === 'off') {
      nextState = 'context'
    } else if (repeatState === 'context') {
      nextState = 'track'
    }
    onCommand('SET_REPEAT_MODE', nextState)
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="center"
      alignItems="center"
    >
      <IconButton
        onClick={() => onCommand('TOGGLE_SHUFFLE', !shuffleState)}
        disabled={disabled}
        sx={{
          color: shuffleState ? '#1DB954' : 'white',
          width: 48,
          height: 48,
        }}
        aria-label="Toggle Shuffle"
      >
        <Shuffle />
      </IconButton>
      <IconButton
        onClick={() => onCommand('PREVIOUS')}
        data-testid="spotify-prev"
        disabled={disabled}
        sx={{ color: 'white', width: 48, height: 48 }}
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
        sx={{ color: 'white', width: 48, height: 48 }}
        aria-label="Next Track"
      >
        <SkipNext sx={{ fontSize: 30 }} />
      </IconButton>
      <IconButton
        onClick={handleRepeatClick}
        disabled={disabled}
        sx={{
          color: repeatState !== 'off' ? '#1DB954' : 'white',
          width: 48,
          height: 48,
        }}
        aria-label="Toggle Repeat"
      >
        {repeatState === 'track' ? <RepeatOne /> : <Repeat />}
      </IconButton>
    </Stack>
  )
}

export default PlaybackControls
