// File: components/HeartRateZoneIndicator.tsx
'use client'
import React from 'react'
import Typography from '@mui/material/Typography'
import theme from '@/lib/theme'

// --- Constants ---
// Heart Rate Zone Boundaries (as percentage of Max HR)
export const HR_ZONES = [
  {
    name: 'Warm-up',
    min: 0.5,
    color: theme.palette.secondary.light,
    progressColor: theme.palette.secondary.main,
    bgColor: theme.palette.secondary.main,
  },
  {
    name: 'Fat Burn',
    min: 0.6,
    color: theme.palette.success.light,
    progressColor: theme.palette.success.main,
    bgColor: theme.palette.success.main,
  },
  {
    name: 'Cardio',
    min: 0.7,
    color: theme.palette.warning.light,
    progressColor: theme.palette.warning.main,
    bgColor: theme.palette.warning.dark,
  },
  {
    name: 'Peak',
    min: 0.85,
    color: theme.palette.primary.light,
    progressColor: theme.palette.primary.main,
    bgColor: theme.palette.primary.main,
  },
  {
    name: 'Max',
    min: 0.95,
    color: theme.palette.error.dark,
    progressColor: theme.palette.error.dark,
    bgColor: theme.palette.error.dark,
  },
]

// Zone color lookup for easy access (zone 1-5)
export const ZONE_COLORS = {
  grey: '#9E9E9E', // Below zone 1
  blue: theme.palette.secondary.main, // Zone 1: Warm-up
  green: theme.palette.success.main, // Zone 2: Fat Burn
  yellow: theme.palette.warning.main, // Zone 3: Cardio
  red: theme.palette.primary.main, // Zone 4: Peak
  purple: theme.palette.error.dark, // Zone 5: Max
}

export interface HrZoneProps {
  zone: string
  percentage: number
  color: string
  progressColor: string
  backgroundColor: string
  bpm: number
}

/**
 * Calculates the current zone, percentage of max HR, and returns MUI-ready props.
 */
export const getHrZoneProps = (
  currentHr: number,
  maxHr: number
): HrZoneProps => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zone: 'No Data',
      percentage: 0,
      color: theme.palette.text.secondary,
      progressColor: theme.palette.text.secondary,
      backgroundColor: theme.palette.text.secondary,
      bpm: 0,
    }
  }

  const percentageOfMax = Math.min(100, Math.round((currentHr / maxHr) * 100))
  let zone = HR_ZONES[0]

  for (let i = HR_ZONES.length - 1; i >= 0; i--) {
    const hrZone = HR_ZONES[i]
    if (hrZone && percentageOfMax / 100 >= hrZone.min) {
      zone = hrZone
      break
    }
  }

  if (!zone) {
    return {
      zone: 'Unknown',
      percentage: percentageOfMax,
      color: theme.palette.text.secondary,
      progressColor: theme.palette.text.secondary,
      backgroundColor: theme.palette.text.secondary,
      bpm: currentHr,
    }
  }

  return {
    zone: zone.name,
    percentage: percentageOfMax,
    color: zone.color,
    progressColor: zone.progressColor,
    backgroundColor: zone.bgColor,
    bpm: currentHr,
  }
}

interface HeartRateZoneIndicatorProps {
  currentHr: number
  maxHr: number
}

const HeartRateZoneIndicator: React.FC<HeartRateZoneIndicatorProps> = ({
  currentHr,
  maxHr,
}) => {
  const { zone, percentage } = getHrZoneProps(currentHr, maxHr)

  return (
    <>
      <Typography
        data-testid="live-hr-percent"
        sx={{
          fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
          fontSize: { xs: '5rem', sm: '6rem', md: '7rem' },
          fontWeight: 900,
          lineHeight: 0.85,
          my: 0.5,
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          animation: 'subtle-pulse 2s infinite ease-in-out',
          animationPlayState: currentHr > 0 ? 'running' : 'paused',
        }}
      >
        {percentage}%
      </Typography>
      <Typography variant="h6">{zone}</Typography>
    </>
  )
}

export default HeartRateZoneIndicator
