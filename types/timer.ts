// types/timer.ts
import { TimerPhase } from './core'

export type PhaseProps = {
  [key in TimerPhase]: {
    color: string
    label: string
  }
}
