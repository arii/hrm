'use client'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

interface SpotifyPlaybackControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  disabled?: boolean
}

const SpotifyPlaybackControls = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  disabled = false,
}: SpotifyPlaybackControlsProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        justifySelf: 'center',
      }}
      data-testid="spotify-playback-controls"
    >
      <IconButton
        size="small"
        onClick={onPrevious}
        disabled={disabled}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Previous track"
        data-testid="spotify-previous-button"
      >
        <SkipPreviousIcon />
      </IconButton>
      <IconButton
        size="medium"
        onClick={onPlayPause}
        disabled={disabled}
        sx={{
          color: 'common.white',
          backgroundColor: 'grey.700',
          '&:hover': { backgroundColor: 'grey.600' },
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        data-testid="spotify-play-pause-button"
      >
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton
        size="small"
        onClick={onNext}
        disabled={disabled}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Next track"
        data-testid="spotify-next-button"
      >
        <SkipNextIcon />
      </IconButton>
    </Box>
  )
}

export default SpotifyPlaybackControls
