import { Theme } from '@mui/material/styles'
import { TimerData } from '../types/websocket'
import { WorkoutData, WorkoutItem } from '../types/index' // Corrected import
import { WorkoutColumnsProps } from '@/components/WorkoutColumns'

// Define types for MUI color props
type MuiColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'

export const getHrZoneProps = (
  currentHr: number | null,
  maxHr: number,
  theme: Theme
) => {
  if (currentHr === null) {
    return {
      backgroundColor: theme.palette.grey[500],
      textColor: theme.palette.getContrastText(theme.palette.grey[500]),
      zoneName: 'Signal Drop',
      zone: 0,
      percentage: 0,
    }
  }

  const percentage = maxHr > 0 ? (currentHr / maxHr) * 100 : 0

  if (percentage < 50) {
    return {
      backgroundColor: theme.palette.grey[500],
      textColor: theme.palette.getContrastText(theme.palette.grey[500]),
      zoneName: 'Rest',
      zone: 0,
      percentage,
    }
  } else if (percentage < 60) {
    return {
      backgroundColor: theme.palette.info.main,
      textColor: theme.palette.info.contrastText,
      zoneName: 'Warm-up',
      zone: 1,
      percentage,
    }
  } else if (percentage < 70) {
    return {
      backgroundColor: theme.palette.secondary.main,
      textColor: theme.palette.secondary.contrastText,
      zoneName: 'Warm-up',
      zone: 2,
      percentage,
    }
  } else if (percentage < 80) {
    return {
      backgroundColor: theme.palette.success.main,
      textColor: theme.palette.success.contrastText,
      zoneName: 'Cardio',
      zone: 3,
      percentage,
    }
  } else if (percentage < 90) {
    return {
      backgroundColor: theme.palette.warning.main,
      textColor: theme.palette.warning.contrastText,
      zoneName: 'Peak',
      zone: 4,
      percentage,
    }
  } else {
    return {
      backgroundColor: theme.palette.error.main,
      textColor: theme.palette.error.contrastText,
      zoneName: 'Max',
      zone: 5,
      percentage,
    }
  }
}

interface TimerProps {
  text: string
  color: MuiColor
  backgroundColor: string // Tailwind bg class
  progressColor: string // Hex color
}

/**
 * Returns props (color, text) for the Tabata Timer phase display.
 */
export const getTimerProps = (
  currentPhase: TimerData['currentPhase']
): TimerProps => {
  switch (currentPhase) {
    case 'PREPARE':
      return {
        text: 'GET READY',
        color: 'warning', // MUI color for yellow/warning
        backgroundColor: 'bg-yellow-500/10',
        progressColor: '#f59e0b',
      }
    case 'WORK':
      return {
        text: 'WORK',
        color: 'error', // MUI color for red
        backgroundColor: 'bg-red-500/10',
        progressColor: '#ef4444',
      }
    case 'REST':
      return {
        text: 'REST',
        color: 'success', // MUI color for green
        backgroundColor: 'bg-green-500/10',
        progressColor: '#22c55e',
      }
    case 'RUNNING':
      return {
        text: 'RUNNING',
        color: 'primary', // MUI color for blue/primary
        backgroundColor: 'bg-blue-500/10',
        progressColor: '#2563eb',
      }
    case 'COOLDOWN':
      return {
        text: 'COOLDOWN',
        color: 'info', // MUI color for blue/info
        backgroundColor: 'bg-blue-500/10',
        progressColor: '#3b82f6',
      }
    case 'IDLE':
    default:
      return {
        text: 'READY',
        color: 'secondary', // MUI color for gray/secondary
        backgroundColor: 'bg-gray-200',
        progressColor: '#6b7280',
      }
  }
}

export const transformWorkoutDataToColumns = (
  data: WorkoutData
): WorkoutColumnsProps['columns'] => {
  if (!data) return []

  return data.map((category: WorkoutItem) => ({
    title: category.category,
    items: category.exercises.map((ex: string) => ({
      title: ex,
    })),
  }))
}
