import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import { setOptimisticPlaying } from '@/lib/spotify/optimisticPlayback'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'

interface TransportColumnProps {
  displayPlaying: boolean
  executeSpotify: ExecuteSpotify
}

/** Center column: previous / play-pause / next transport controls. */
export const TransportColumn = ({
  displayPlaying,
  executeSpotify,
}: TransportColumnProps) => {
  const handlePlayPauseToggle = () => {
    if (displayPlaying) {
      setOptimisticPlaying(false)
      executeSpotify('PAUSE')
    } else {
      setOptimisticPlaying(true)
      executeSpotify('PLAY')
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        justifySelf: 'center',
      }}
    >
      <IconButton
        size="small"
        onClick={() => executeSpotify('PREVIOUS')}
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
        onClick={handlePlayPauseToggle}
        sx={{
          color: 'common.white',
          backgroundColor: 'grey.700',
          '&:hover': { backgroundColor: 'grey.600' },
        }}
        aria-label={displayPlaying ? 'Pause' : 'Play'}
        data-testid="spotify-play-pause-button"
      >
        {displayPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton
        size="small"
        onClick={() => executeSpotify('NEXT')}
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
