// File: services/timer/timerCommands.ts
/**
 * Encapsulates all state-mutating operations (commands) for the timer.
 * This class directly modifies the state object and triggers broadcasts.
 */
import { ServerMessage } from '../../types/websocket'
import { TimerMode } from '../../types/core'
import { DualModeTimerState, START_COUNTDOWN_DURATION } from './timerState'
import { TimerQueries } from './timerQueries'

export class TimerCommands {
  private state: DualModeTimerState
  private broadcastUpdate: (message: ServerMessage) => void
  private queries: TimerQueries

  /**
   * @param {DualModeTimerState} state The timer state object to mutate.
   * @param {function} broadcastUpdate Function to send updates to clients.
   * @param {TimerQueries} queries The queries instance for getting public state.
   */
  constructor(
    state: DualModeTimerState,
    broadcastUpdate: (message: ServerMessage) => void,
    queries: TimerQueries
  ) {
    this.state = state
    this.broadcastUpdate = broadcastUpdate
    this.queries = queries
  }

  // --- Public Command Methods ---

  /**
   * Starts or resumes the timer.
   * If starting from IDLE, it initiates a PREPARE countdown.
   */
  public start(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.state._startTime = Date.now()

    if (this.state.currentPhase === 'IDLE') {
      this.state.currentPhase = 'PREPARE'
      this.state.timeRemaining = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    }

    this.state._timerInterval = setInterval(this.updateTimer, 1000)
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  /**
   * Pauses the currently running timer.
   */
  public pause(): void {
    if (!this.state.isRunning || !this.state._startTime) return

    if (this.state.mode === 'STOPWATCH' && this.state.currentPhase === 'RUNNING') {
      this.state._pausedElapsedTime = this.state.timeElapsed
    }

    this.state.isRunning = false
    if (this.state._timerInterval) clearInterval(this.state._timerInterval)
    this.state._timerInterval = null
    this.state._startTime = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  /**
   * Stops the timer and resets it to its initial state for the current mode.
   */
  public stop(): void {
    if (this.state._timerInterval) clearInterval(this.state._timerInterval)

    this.state.isRunning = false
    this.state.currentPhase = 'IDLE'
    this.state.timeElapsed = 0
    this.state.timeRemaining = this.state.mode === 'TABATA' ? this.state.workDuration : 0
    this.state.soundToPlay = undefined

    this.resetCountdownMarker()
    this.state._pausedElapsedTime = 0
    this.state._startTime = null
    this.state._timerInterval = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  /**
   * Sets the timer's operational mode (TABATA or STOPWATCH).
   * @param {TimerMode} mode The new mode to set.
   */
  public setMode(mode: TimerMode): void {
    if (this.state.isRunning) this.stop()

    this.state.mode = mode
    this.state.currentPhase = 'IDLE'
    this.state.timeRemaining = mode === 'TABATA' ? this.state.workDuration : 0
    this.state.timeElapsed = 0
    this.state.soundToPlay = undefined
    this.resetCountdownMarker()
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  /**
   * Configures the durations for the TABATA mode.
   * @param {object} config The new configuration.
   */
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

  // --- Internal Logic Methods ---

  /**
   * The core timer tick logic, executed every second by `setInterval`.
   */
  private updateTimer = (): void => {
    if (!this.state.isRunning || !this.state._startTime) return

    if (this.state.mode === 'STOPWATCH' && this.state.currentPhase === 'RUNNING') {
      const currentDelta = Math.floor((Date.now() - this.state._startTime) / 1000)
      this.state.timeElapsed = this.state._pausedElapsedTime + currentDelta
    }

    if (this.state.mode === 'TABATA' || this.state.currentPhase === 'PREPARE') {
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

  /**
   * Manages the transition from one timer phase to the next.
   */
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

      default:
        this.stop()
        break
    }
  }

  /**
   * Adds a sound cue to the state and broadcasts an update.
   * @param {'WORK' | 'REST' | 'COUNTDOWN'} sound The sound to play.
   */
  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN'): void {
    this.state.soundToPlay = sound
    this.state.soundEventId += 1
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.queries.getState() })
  }

  /**
   * Resets the internal marker used to prevent duplicate countdown sounds.
   */
  private resetCountdownMarker(): void {
    this.state._countdownMarker = null
  }

  /**
   * Checks if a countdown sound cue should be played.
   */
  private handleCountdownCue(): void {
    const phase = this.state.currentPhase
    const remaining = this.state.timeRemaining
    if (phase === 'IDLE' || phase === 'RUNNING' || phase === 'COOLDOWN' || remaining <= 0) {
      return
    }

    const marker = `${phase}-${remaining}`
    if (remaining <= 3 && this.state._countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.state._countdownMarker = marker
    }
  }

  /**
   * Cleans up resources, specifically the timer interval, to prevent memory leaks.
   */
  public dispose(): void {
    if (this.state._timerInterval) {
      clearInterval(this.state._timerInterval)
      this.state._timerInterval = null
    }
  }
}
