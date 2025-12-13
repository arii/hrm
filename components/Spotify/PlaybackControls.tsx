// components/Spotify/PlaybackControls.tsx
import React from 'react'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import RepeatIcon from '@mui/icons-material/Repeat'
import RepeatOneIcon from '@mui/icons-material/RepeatOne'
import VolumeControl from './VolumeControl'

interface PlaybackControlsProps {
  isPlaying: boolean
  shuffleState: boolean
  repeatState: 'off' | 'context' | 'track'
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted: (volume: number) => void
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  shuffleState,
  repeatState,
  onPlayPause,
  onNext,
  onPrevious,
  onToggleShuffle,
  onToggleRepeat,
  volume,
  onVolumeChange,
  onVolumeChangeCommitted,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <IconButton
        aria-label="shuffle"
        onClick={onToggleShuffle}
        color={shuffleState ? 'primary' : 'inherit'}
      >
        <ShuffleIcon />
      </IconButton>
      <IconButton aria-label="previous" onClick={onPrevious}>
        <SkipPreviousIcon />
      </IconButton>
      <IconButton
        aria-label={isPlaying ? 'pause' : 'play'}
        onClick={onPlayPause}
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        {isPlaying ? (
          <PauseIcon sx={{ fontSize: 40 }} />
        ) : (
          <PlayArrowIcon sx={{ fontSize: 40 }} />
        )}
      </IconButton>
      <IconButton aria-label="next" onClick={onNext}>
        <SkipNextIcon />
      </IconButton>
      <IconButton
        aria-label="repeat"
        onClick={onToggleRepeat}
        color={repeatState !== 'off' ? 'primary' : 'inherit'}
      >
        {repeatState === 'track' ? <RepeatOneIcon /> : <RepeatIcon />}
      </IconButton>
      <VolumeControl
        volume={volume}
        onVolumeChange={onVolumeChange}
        onVolumeChangeCommitted={onVolumeChangeCommitted}
      />
    </Box>
  )
}

export default PlaybackControls
