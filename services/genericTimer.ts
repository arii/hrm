// Implements a generic, reusable timer and stopwatch service.
import { GenericTimerState, TimerMode } from '@/types/genericTimer'

type TimerUpdateCallback = (state: Readonly<GenericTimerState>) => void

interface GenericTimerOptions {
  mode: TimerMode
  durationMs?: number
  onUpdate?: TimerUpdateCallback
}

// A flexible timer/stopwatch service that uses a self-adjusting `setTimeout`
// to compensate for drift.
class GenericTimer {
  private state: GenericTimerState
  private onUpdate: TimerUpdateCallback | undefined
  private timerId: NodeJS.Timeout | null = null

  constructor({ mode, durationMs = 0, onUpdate }: GenericTimerOptions) {
    if (mode === 'COUNTDOWN' && durationMs <= 0) {
      throw new Error('Countdown mode requires a positive durationMs.')
    }

    this.state = {
      mode,
      phase: 'IDLE',
      durationMs: mode === 'COUNTDOWN' ? durationMs : 0,
      elapsedMs: 0,
      remainingMs: mode === 'COUNTDOWN' ? durationMs : 0,
      startTime: null,
    }

    this.onUpdate = onUpdate
  }

  // The core timing loop. It calculates elapsed time and schedules the next tick
  // with an adjusted delay to maintain accuracy.
  private tick = (): void => {
    if (this.state.phase !== 'RUNNING' || this.state.startTime === null) {
      return
    }

    const now = Date.now()
    const elapsedSinceStart = now - this.state.startTime
    this.state.elapsedMs = elapsedSinceStart

    if (this.state.mode === 'COUNTDOWN') {
      this.state.remainingMs = Math.max(
        0,
        this.state.durationMs - this.state.elapsedMs
      )
      if (this.state.remainingMs === 0) {
        this.state.phase = 'FINISHED'
        this.state.elapsedMs = this.state.durationMs // Ensure elapsed doesn't exceed duration
        if (this.timerId) clearTimeout(this.timerId)
        this.timerId = null
        this.onUpdate?.(this.getState())
        return
      }
    }

    this.onUpdate?.(this.getState())

    // Self-adjusting timeout
    const nextTickDelay = 1000 - (elapsedSinceStart % 1000)
    this.timerId = setTimeout(this.tick, nextTickDelay)
  }

  public start(): void {
    if (this.state.phase === 'RUNNING' || this.state.phase === 'FINISHED') {
      return
    }

    this.state.phase = 'RUNNING'
    // To resume correctly, we calculate a new start time based on what's already elapsed.
    this.state.startTime = Date.now() - this.state.elapsedMs

    this.tick()
    this.onUpdate?.(this.getState())
  }

  public pause(): void {
    if (this.state.phase !== 'RUNNING') {
      return
    }

    this.state.phase = 'PAUSED'
    if (this.timerId) clearTimeout(this.timerId)
    this.timerId = null
    this.onUpdate?.(this.getState())
  }

  public stop(): void {
    this.state.phase = 'IDLE'
    this.state.elapsedMs = 0
    this.state.remainingMs = this.state.durationMs
    this.state.startTime = null
    if (this.timerId) clearTimeout(this.timerId)
    this.timerId = null
    this.onUpdate?.(this.getState())
  }

  public getState(): Readonly<GenericTimerState> {
    return Object.freeze({ ...this.state })
  }
}

export default GenericTimer
