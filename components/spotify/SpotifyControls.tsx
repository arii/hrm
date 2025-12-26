// components/spotify/SpotifyControls.tsx
'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'

interface SpotifyControlsProps {
  isPlaying: boolean
  onPlayPauseToggle: () => void
  onSkipNext: () => void
  onSkipPrevious: () => void
}

const SpotifyControls = ({
  isPlaying,
  onPlayPauseToggle,
  onSkipNext,
  onSkipPrevious,
}: SpotifyControlsProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        size="small"
        onClick={onSkipPrevious}
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
        onClick={onPlayPauseToggle}
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
        onClick={onSkipNext}
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

export default SpotifyControls
