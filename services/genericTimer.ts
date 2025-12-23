// File: services/genericTimer.ts
/**
 * @file Implements a generic, reusable timer and stopwatch service.
 * @author Jules
 */

import { GenericTimerState, TimerMode } from '../types/genericTimer'
import { ValidationError } from '../lib/errors'

/**
 * @callback TimerUpdateCallback
 * @param {Readonly<GenericTimerState>} state - The current state of the timer.
 */
type TimerUpdateCallback = (state: Readonly<GenericTimerState>) => void

/**
 * Configuration options for creating a GenericTimer instance.
 */
interface GenericTimerOptions {
  /** The operational mode of the timer. */
  mode: TimerMode
  /** The total duration for a countdown timer, in milliseconds. Required for 'COUNTDOWN' mode. */
  durationMs?: number
  /** An optional callback function that is invoked on every tick and state change. */
  onUpdate?: TimerUpdateCallback
}

/**
 * A flexible and reusable utility service for managing countdowns and stopwatches.
 * This service is designed to be highly accurate by using a self-adjusting `setTimeout`
 * loop, which compensates for potential drifts in JavaScript's timing functions.
 */
class GenericTimer {
  private state: GenericTimerState
  private onUpdate: TimerUpdateCallback | undefined
  private timerId: NodeJS.Timeout | null = null

  /**
   * Creates an instance of the GenericTimer.
   * @param {GenericTimerOptions} options - The configuration for the timer.
   */
  constructor({ mode, durationMs = 0, onUpdate }: GenericTimerOptions) {
    if (mode === 'COUNTDOWN' && durationMs <= 0) {
      throw new ValidationError('Countdown mode requires a positive durationMs.')
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

  /**
   * The core timing loop. It calculates the elapsed time since the last tick
   * and schedules the next tick with an adjusted delay to maintain accuracy.
   */
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

  /**
   * Starts or resumes the timer.
   */
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

  /**
   * Pauses the timer.
   */
  public pause(): void {
    if (this.state.phase !== 'RUNNING') {
      return
    }

    this.state.phase = 'PAUSED'
    if (this.timerId) clearTimeout(this.timerId)
    this.timerId = null
    this.onUpdate?.(this.getState())
  }

  /**
   * Stops and resets the timer to its initial state.
   */
  public stop(): void {
    this.state.phase = 'IDLE'
    this.state.elapsedMs = 0
    this.state.remainingMs = this.state.durationMs
    this.state.startTime = null
    if (this.timerId) clearTimeout(this.timerId)
    this.timerId = null
    this.onUpdate?.(this.getState())
  }

  /**
   * Returns a read-only copy of the current timer state.
   * @returns {Readonly<GenericTimerState>} The current state.
   */
  public getState(): Readonly<GenericTimerState> {
    return Object.freeze({ ...this.state })
  }
}

export default GenericTimer
