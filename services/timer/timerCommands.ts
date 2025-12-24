// File: services/timer/timerCommands.ts

import { ServerMessage } from '../../types/websocket'
import { TimerMode } from '../../types/core'
import {
  DualModeTimerState,
  START_COUNTDOWN_DURATION,
} from './timerState.js'
import TimerQueries from './timerQueries.js'

/**
 * Handles state-mutating operations for the timer.
 * Methods in this class are responsible for all state changes.
 */
class TimerCommands {
  private state: DualModeTimerState
  private broadcastUpdate: (message: ServerMessage) => void
  private queries: TimerQueries // To get state for broadcasting

  constructor(
    state: DualModeTimerState,
    broadcastUpdate: (message: ServerMessage) => void,
    queries: TimerQueries,
  ) {
    this.state = state
    this.broadcastUpdate = broadcastUpdate
    this.queries = queries
  }

  // --- Sound & Cue Management (Private Helpers) ---

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN'): void {
    this.state.soundToPlay = sound
    this.state.soundEventId += 1
    // Broadcast immediately so clients can play sound
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  private resetCountdownMarker(): void {
    this.state._countdownMarker = null
  }

  private handleCountdownCue(): void {
    const phase = this.state.currentPhase
    if (phase === 'IDLE' || phase === 'RUNNING' || phase === 'COOLDOWN') {
      return
    }

    const remaining = this.state.timeRemaining
    if (remaining <= 0) {
      return
    }

    // Build marker per phase + second to avoid replaying countdown in same second
    const marker = `${phase}-${remaining}`
    // Play short beep for countdown during PREPARE, WORK, and REST phases when 1-3 seconds remain
    if (remaining >= 1 && remaining <= 3 && this.state._countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.state._countdownMarker = marker
    }
  }

  // --- Core Timer Logic (Mutations) ---

  private updateTimer = (): void => {
    if (!this.state.isRunning || this.state._startTime === null) return

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      // COUNT UP (STOPWATCH)
      const currentDelta = Math.floor((Date.now() - this.state._startTime) / 1000)
      this.state.timeElapsed = this.state._pausedElapsedTime + currentDelta
    }

    // This applies to TABATA and PREPARE modes (which count down)
    if (
      this.state.mode === 'TABATA' ||
      this.state.currentPhase === 'PREPARE'
    ) {
      const nextRemaining = Math.max(0, this.state.timeRemaining - 1)
      this.state.timeRemaining = nextRemaining

      if (nextRemaining <= 0) {
        this.transitionPhase()
      } else {
        this.handleCountdownCue()
      }
    }

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  public start(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.state._startTime = Date.now()

    // --- UNIVERSAL PREPARE LOGIC ---
    if (this.state.currentPhase === 'IDLE') {
      this.state.currentPhase = 'PREPARE'
      this.state.timeRemaining = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    }

    if (this.state._timerInterval) clearInterval(this.state._timerInterval)
    this.state._timerInterval = setInterval(this.updateTimer, 1000)
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  public pause(): void {
    if (!this.state.isRunning || this.state._startTime === null) return

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      this.state._pausedElapsedTime = this.state.timeElapsed // Save elapsed time
      this.state.currentPhase = 'IDLE'
    }

    this.state.isRunning = false
    if (this.state._timerInterval) clearInterval(this.state._timerInterval)
    this.state._timerInterval = null
    this.state._startTime = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  public stop(): void {
    if (this.state._timerInterval) clearInterval(this.state._timerInterval)

    this.state.isRunning = false
    this.state.currentPhase = 'IDLE'
    this.state.timeElapsed = 0
    this.state.timeRemaining =
      this.state.mode === 'TABATA' ? this.state.workDuration : 0
    delete this.state.soundToPlay
    this.resetCountdownMarker()
    this.state._pausedElapsedTime = 0
    this.state._startTime = null
    this.state._timerInterval = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  // --- Configuration ---
  public setConfig(config: { workDuration: number; restDuration: number }): void {
    const sanitizedWorkDuration = Math.max(1, Math.floor(config.workDuration))
    const sanitizedRestDuration = Math.max(0, Math.floor(config.restDuration))

    this.state.workDuration = sanitizedWorkDuration
    this.state.restDuration = sanitizedRestDuration

    if (!this.state.isRunning && this.state.mode === 'TABATA') {
      this.state.timeRemaining = sanitizedWorkDuration
    }

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  // --- Mode Switching ---
  public setMode(mode: TimerMode): void {
    if (this.state.isRunning) this.stop()
    this.state.mode = mode
    this.state.currentPhase = 'IDLE'
    this.state.timeRemaining =
      mode === 'TABATA' ? this.state.workDuration : 0
    this.state.timeElapsed = 0
    delete this.state.soundToPlay
    this.resetCountdownMarker()
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  // --- Universal Transition Logic (Private) ---

  private transitionPhase(): void {
    this.resetCountdownMarker()
    switch (this.state.currentPhase) {
      case 'PREPARE':
        this.queueSound('WORK')
        if (this.state.mode === 'STOPWATCH') {
          this.state.currentPhase = 'RUNNING'
          this.state.timeElapsed = 0
          this.state._pausedElapsedTime = 0
          this.state._startTime = Date.now()
        } else {
          this.state.currentPhase = 'WORK'
          this.state.timeRemaining = this.state.workDuration
        }
        break

      case 'WORK':
        this.queueSound('REST')
        this.state.currentPhase = 'REST'
        this.state.timeRemaining = this.state.restDuration
        break

      case 'REST':
        this.queueSound('WORK')
        this.state.currentPhase = 'WORK'
        this.state.timeRemaining = this.state.workDuration
        break

      case 'IDLE':
      case 'COOLDOWN':
      case 'RUNNING':
        this.stop()
        break
    }
  }
}

export default TimerCommands
