// types/shared.ts
export type TimerMode = 'STOPWATCH' | 'TABATA'
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'RUNNING'
  | 'WORK'
  | 'REST'
  | 'COOLDOWN'

export interface HrmStaticMetadata {
  clientId: string
  name: string
  age: number
  maxHr: number // Calculated (220 - age)
}
