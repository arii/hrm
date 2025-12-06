// File: types/shared.ts

export type TimerMode = 'STOPWATCH' | 'TABATA'

export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'RUNNING' // General running state for Stopwatch
  | 'WORK' // Specific running phase for Tabata
  | 'REST' // Specific running phase for Tabata
  | 'COOLDOWN'
