'use client'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface ProgressBarProps {
  displayProgress: number
  durationMs: number
  onSeek: (positionMs: number) => void
  onSeekStart: () => void
  onSeekEnd: (positionMs: number) => void
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const ProgressBar = ({
  displayProgress,
  durationMs,
  onSeek,
  onSeekStart,
  onSeekEnd,
}: ProgressBarProps) => {
  const handleSliderChange = (_: Event, value: number | number[]) => {
    onSeek(value as number)
  }

  const handleSliderChangeCommitted = (
    _: React.SyntheticEvent | Event,
    value: number | number[]
  ) => {
    onSeekEnd(value as number)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(displayProgress)}
      </Typography>
      <Slider
        aria-label="Track progress"
        value={displayProgress}
        min={0}
        max={durationMs}
        onChange={handleSliderChange}
        onChangeCommitted={handleSliderChangeCommitted}
        onMouseDown={onSeekStart}
        sx={{
          color: 'primary.main',
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
            '&:before': {
              boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
            },
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0px 0px 0px 8px rgb(0 0 0 / 16%)',
            },
            '&.Mui-active': {
              width: 20,
              height: 20,
            },
          },
          '& .MuiSlider-rail': {
            opacity: 0.28,
          },
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(durationMs)}
      </Typography>
    </Box>
  )
}

export default ProgressBar
