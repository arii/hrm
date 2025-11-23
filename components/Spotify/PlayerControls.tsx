import React from 'react'
import { IconButton, Box } from '@mui/material'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrev: () => void
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        size="small"
        onClick={onPrev}
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
        onClick={onPlayPause}
        sx={{
          color: 'common.white',
          backgroundColor: 'grey.700',
          '&:hover': { backgroundColor: 'grey.600' },
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton
        size="small"
        onClick={onNext}
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

export default PlayerControls
