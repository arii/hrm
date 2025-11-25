// File: utils/visualization.ts
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import { TimerMode, TimerPhase } from '../types/websocket'

// --- Constants ---
// Heart Rate Zone Boundaries (as percentage of Max HR)
export const HR_ZONES = [
  {
    name: 'Warm-up',
    min: 0.5,
    progressColor: '#3b82f6', // Darker blue
  },
  {
    name: 'Fat Burn',
    min: 0.6,
    progressColor: '#22c55e', // Green
  },
  {
    name: 'Cardio',
    min: 0.7,
    progressColor: '#d97706', // Darker orange/yellow
  },
  {
    name: 'Peak',
    min: 0.85,
    progressColor: '#ef4444', // Red
  },
  {
    name: 'Max',
    min: 0.95,
    progressColor: '#9333ea', // Purple
  },
]

interface HrZoneProps {
  zone: string
  percentage: number
  progressColor: string // Hex color for MUI components
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
      progressColor: '#9ca3af', // Gray
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

  return {
    zone: zone ? zone.name : 'Unknown',
    percentage: percentageOfMax,
    progressColor: zone ? zone.progressColor : '#9ca3af',
    bpm: currentHr,
  }
}

// Helper to format time values
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Returns all display properties for the timer based on its current state.
 * Consolidates logic for time formatting, color selection, and labeling.
 */
export const getTimerPhaseProps = (
  phase: TimerPhase,
  timeRemaining: number,
  timeElapsed: number,
  mode: TimerMode
) => {
  let displayTime: string
  let color: string
  let label: string

  if (phase === 'PREPARE') {
    // PREPARE: Show countdown seconds only
    displayTime = String(timeRemaining).padStart(2, '0')
    color = 'warning.main'
    label = 'GET READY'
  } else if (mode === 'STOPWATCH' && phase === 'RUNNING') {
    // STOPWATCH: Show elapsed time MM:SS
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    color = 'primary.main'
    label = 'RUNNING'
  } else if (
    mode === 'TABATA' &&
    (phase === 'WORK' || phase === 'REST' || phase === 'COOLDOWN')
  ) {
    // TABATA: Show remaining time MM:SS
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    displayTime = `${pad(mm)}:${pad(ss)}`

    if (phase === 'WORK') {
      color = 'error.main'
      label = 'WORK'
    } else if (phase === 'REST') {
      color = 'success.main'
      label = 'REST'
    } else {
      // COOLDOWN
      color = 'info.main'
      label = 'COOLDOWN'
    }
  } else {
    // IDLE or default
    displayTime = '00:00'
    color = 'text.secondary'
    label = 'READY'
  }

  return { displayTime, color, label }
}
