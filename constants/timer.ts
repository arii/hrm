// constants/timer.ts
import { TimerPhase } from '@/types/core'

type PhaseProps = {
  [key in TimerPhase]: {
    color: string
    label: string
  }
}

export const PREPARE_DURATION = 5

export const phaseProps: PhaseProps = {
  PREPARE: { color: '#f59e0b', label: 'GET READY' },
  WORK: { color: '#ef4444', label: 'WORK' },
  REST: { color: '#22c55e', label: 'REST' },
  RUNNING: { color: '#3b82f6', label: 'RUNNING' },
  IDLE: { color: '#6b7280', label: 'IDLE' },
  COOLDOWN: { color: '#6b7280', label: 'COOLDOWN' },
}
