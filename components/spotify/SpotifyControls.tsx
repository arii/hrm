// components/spotify/SpotifyControls.tsx
'use client'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'

interface SpotifyControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
}

const SpotifyControls = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}: SpotifyControlsProps) => {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={onPrevious}>
        <SkipPreviousIcon />
      </IconButton>
      <IconButton onClick={onPlayPause}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton onClick={onNext}>
        <SkipNextIcon />
      </IconButton>
    </Stack>
  )
}

export default SpotifyControls
