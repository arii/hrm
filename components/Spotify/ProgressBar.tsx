'use client'
import { useEffect, useState, useCallback } from 'react'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { debounce } from 'lodash'

interface ProgressBarProps {
  progressMs: number
  durationMs: number
  isPlaying: boolean
  onSeek: (positionMs: number) => void
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const ProgressBar = ({
  progressMs,
  durationMs,
  isPlaying,
  onSeek,
}: ProgressBarProps) => {
  const [internalProgress, setInternalProgress] = useState(progressMs)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isDragging) {
      setInternalProgress(progressMs)
    }
  }, [progressMs, isDragging])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isPlaying && !isDragging) {
      interval = setInterval(() => {
        setInternalProgress((prev) => Math.min(prev + 1000, durationMs))
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPlaying, isDragging, durationMs])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSeek = useCallback(
    debounce((value: number) => {
      onSeek(value)
    }, 200),
    [onSeek]
  )

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const newProgress = value as number
    setInternalProgress(newProgress)
    setIsDragging(true)
    debouncedSeek(newProgress)
  }

  const handleSliderChangeCommitted = () => {
    setIsDragging(false)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(internalProgress)}
      </Typography>
      <Slider
        aria-label="Track progress"
        value={internalProgress}
        min={0}
        max={durationMs}
        onChange={handleSliderChange}
        onChangeCommitted={handleSliderChangeCommitted}
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
