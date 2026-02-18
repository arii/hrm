// File: services/tabataTimer.ts
/**
 * Consolidated Dual-Mode Timer Service.
 * This class manages the state and logic for both TABATA and STOPWATCH modes,
 * handling transitions, sound cues, and broadcasting updates to clients.
 * It uses absolute timing (Date.now()) to maintain accuracy against drift.
 */
import { ServerMessage } from '../types/websocket'
import { TimerData, TimerMode, TimerPhase } from '../types/core'
import {
  DEFAULT_WORK_DURATION,
  DEFAULT_REST_DURATION,
  START_COUNTDOWN_DURATION,
  TIMER_INTERVAL,
} from '../utils/constants.js'
import { ConfigurationError } from '../types/errors.js'

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

class TabataTimer {
  // Publicly exposed state (managed internally)
  private mode: TimerMode = 'TABATA'
  private isRunning: boolean = false
  private currentPhase: TimerPhase = 'IDLE'
  private timeElapsed: number = 0
  private timeRemaining: number = DEFAULT_WORK_DURATION
  private workDuration: number = DEFAULT_WORK_DURATION
  private restDuration: number = DEFAULT_REST_DURATION
  private soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  private soundEventId: number = 0

  // Internal state for timer logic
  private startTime: number | null = null
  private timerInterval: NodeJS.Timeout | null = null
  private pausedTimeRemaining: number = DEFAULT_WORK_DURATION
  private pausedTimeElapsed: number = 0
  private countdownMarker: string | null = null

  private readonly broadcastUpdate: (message: ServerMessage) => void

  /**
   * @param {function} broadcastUpdate Function to send updates to clients.
   */
  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
  }

  /**
   * Returns the public-facing state of the timer.
   * @returns {TimerData} The current timer data.
   */
  public getState(): TimerData {
    return {
      isRunning: this.isRunning,
      currentPhase: this.currentPhase,
      timeRemaining: this.timeRemaining,
      timeElapsed: this.timeElapsed,
      caloriesBurned: 0, // Placeholder
      mode: this.mode,
      workDuration: this.workDuration,
      restDuration: this.restDuration,
      ...(this.soundToPlay !== undefined && {
        soundToPlay: this.soundToPlay,
      }),
      soundEventId: this.soundEventId,
    }
  }

  /**
   * Handles incoming commands from clients.
   * @param {TimerCommand} command The command to execute.
   */
  public handleCommand(command: TimerCommand): void {
    switch (command) {
      case 'START':
        this.start()
        break
      case 'PAUSE':
        this.pause()
        break
      case 'STOP':
        this.stop()
        break
      default:
        console.warn(`Unknown timer command: ${command}`)
    }
  }

  // --- Command Logic ---

  /**
   * Starts or resumes the timer.
   */
  private start(): void {
    if (this.isRunning) return

    this.isRunning = true
    const now = Date.now()

    if (this.currentPhase === 'IDLE') {
      this.currentPhase = 'PREPARE'
      this.timeRemaining = START_COUNTDOWN_DURATION
      this.pausedTimeRemaining = START_COUNTDOWN_DURATION
      this.timeElapsed = 0
      this.pausedTimeElapsed = 0
      this.resetCountdownMarker()
    }

    this.startTime = now
    this.timerInterval = setInterval(this.updateTimer, TIMER_INTERVAL)
    this.broadcast()
  }

  /**
   * Pauses the currently running timer.
   */
  private pause(): void {
    if (!this.isRunning || !this.startTime) return

    this.updateTimer() // Final sync before pausing

    this.isRunning = false
    if (this.timerInterval) clearInterval(this.timerInterval)
    this.timerInterval = null

    this.pausedTimeRemaining = this.timeRemaining
    this.pausedTimeElapsed = this.timeElapsed
    this.startTime = null

    this.broadcast()
  }

  /**
   * Stops the timer and resets it to its initial state.
   */
  private stop(): void {
    if (this.timerInterval) clearInterval(this.timerInterval)

    this.isRunning = false
    this.currentPhase = 'IDLE'
    this.timeElapsed = 0
    this.timeRemaining = this.mode === 'TABATA' ? this.workDuration : 0

    this.resetCountdownMarker()
    this.pausedTimeRemaining = this.timeRemaining
    this.pausedTimeElapsed = 0
    this.startTime = null
    this.timerInterval = null
    this.soundToPlay = undefined

    this.broadcast()
  }

  /**
   * Sets the timer's operational mode.
   * @param {TimerMode} mode The new mode.
   */
  public setMode(mode: TimerMode): void {
    if (this.isRunning) this.stop()

    this.mode = mode
    this.currentPhase = 'IDLE'
    this.timeRemaining = mode === 'TABATA' ? this.workDuration : 0
    this.pausedTimeRemaining = this.timeRemaining
    this.timeElapsed = 0
    this.pausedTimeElapsed = 0
    this.soundToPlay = undefined
    this.resetCountdownMarker()
    this.broadcast()
  }

  /**
   * Configures the durations for the TABATA mode.
   * @param {object} config The new configuration.
   */
  public setConfig(config: {
    workDuration: number
    restDuration: number
  }): void {
    if (config.workDuration < 1 || config.restDuration < 0) {
      throw new ConfigurationError(
        `Invalid timer configuration: workDuration must be positive, and restDuration must be non-negative. Received workDuration: ${config.workDuration}, restDuration: ${config.restDuration}`
      )
    }
    this.workDuration = Math.floor(config.workDuration)
    this.restDuration = Math.floor(config.restDuration)

    if (!this.isRunning && this.mode === 'TABATA') {
      this.timeRemaining = this.workDuration
      this.pausedTimeRemaining = this.workDuration
    }

    this.broadcast()
  }

  // --- Internal Timer Logic ---

  /**
   * Core timer tick logic.
   */
  private updateTimer = (): void => {
    if (!this.isRunning || !this.startTime) return

    const now = Date.now()
    const elapsedSinceLastStart = Math.floor((now - this.startTime) / 1000)

    if (this.mode === 'STOPWATCH' && this.currentPhase === 'RUNNING') {
      this.timeElapsed = this.pausedTimeElapsed + elapsedSinceLastStart
    } else if (this.mode === 'TABATA' || this.currentPhase === 'PREPARE') {
      const nextRemaining = Math.max(
        0,
        this.pausedTimeRemaining - elapsedSinceLastStart
      )
      this.timeRemaining = nextRemaining

      if (nextRemaining <= 0) {
        this.transitionPhase(now)
      } else {
        this.handleCountdownCue()
      }
    }

    this.broadcast()
  }

  /**
   * Transitions between phases.
   * @param {number} now The current timestamp to use as the new start time.
   */
  private transitionPhase(now: number): void {
    this.resetCountdownMarker()
    this.startTime = now
    this.pausedTimeElapsed = 0

    switch (this.currentPhase) {
      case 'PREPARE':
        this.queueSound('WORK')
        if (this.mode === 'STOPWATCH') {
          this.currentPhase = 'RUNNING'
          this.timeElapsed = 0
        } else {
          this.currentPhase = 'WORK'
          this.timeRemaining = this.workDuration
          this.pausedTimeRemaining = this.workDuration
        }
        break

      case 'WORK':
        this.queueSound('REST')
        this.currentPhase = 'REST'
        this.timeRemaining = this.restDuration
        break

      case 'REST':
        this.queueSound('WORK')
        this.currentPhase = 'WORK'
        this.timeRemaining = this.workDuration
        break

      default:
        this.stop()
        break
    }

    // For TABATA phases, we always sync pausedTimeRemaining after transition
    if (this.currentPhase === 'WORK' || this.currentPhase === 'REST') {
      this.pausedTimeRemaining = this.timeRemaining
    }
  }

  /**
   * Queues a sound and triggers a broadcast.
   */
  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN'): void {
    this.soundToPlay = sound
    this.soundEventId += 1
    this.broadcast()
  }

  /**
   * Resets the countdown sound marker.
   */
  private resetCountdownMarker(): void {
    this.countdownMarker = null
  }

  /**
   * Handles playing countdown sound cues.
   */
  private handleCountdownCue(): void {
    const phase = this.currentPhase
    const remaining = this.timeRemaining
    if (
      phase === 'IDLE' ||
      phase === 'RUNNING' ||
      phase === 'COOLDOWN' ||
      remaining <= 0
    ) {
      return
    }

    const marker = `${phase}-${remaining}`
    if (remaining <= 3 && this.countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.countdownMarker = marker
    }
  }

  /**
   * Helper to broadcast the current state.
   */
  private broadcast(): void {
    this.broadcastUpdate({
      type: 'TIMER_UPDATE',
      payload: this.getState(),
    })
  }

  /**
   * Cleanup resources.
   */
  public dispose(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
}

export default TabataTimer
