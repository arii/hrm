// File: services/tabataTimer.ts
/**
 * Orchestrator for the Dual-Mode Timer Service.
 * This class consolidates the timer logic, replacing the previous fragmented implementation.
 * It uses absolute timing via Date.now() to prevent cumulative drift.
 */
import { ServerMessage } from '../types/websocket'
import { TimerData, TimerMode, TimerPhase } from '../types/core'
import {
  DEFAULT_WORK_DURATION,
  DEFAULT_REST_DURATION,
  START_COUNTDOWN_DURATION,
  TIMER_INTERVAL,
} from '../utils/constants'
import { ConfigurationError } from '../types/errors'

interface DualModeTimerState {
  // Publicly exposed state
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number
  timeRemaining: number
  workDuration: number
  restDuration: number
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number

  // Internal state for timer logic
  _startTime: number | null // For STOPWATCH absolute start time
  _phaseStartTime: number | null // For TABATA/PREPARE phase absolute start time
  _phaseTotalDuration: number // Duration of current phase in seconds
  _timerInterval: NodeJS.Timeout | null
  _pausedElapsedTime: number // For STOPWATCH pause
  _pausedRemainingTime: number // For TABATA pause
  _countdownMarker: string | null
}

const createInitialTimerState = (): DualModeTimerState => ({
  mode: 'TABATA',
  isRunning: false,
  currentPhase: 'IDLE',
  timeElapsed: 0,
  timeRemaining: DEFAULT_WORK_DURATION,
  workDuration: DEFAULT_WORK_DURATION,
  restDuration: DEFAULT_REST_DURATION,
  soundEventId: 0,
  soundToPlay: undefined,

  _startTime: null,
  _phaseStartTime: null,
  _phaseTotalDuration: 0,
  _timerInterval: null,
  _pausedElapsedTime: 0,
  _pausedRemainingTime: 0,
  _countdownMarker: null,
})

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

class TabataTimer {
  private state: DualModeTimerState
  private readonly broadcastUpdate: (message: ServerMessage) => void

  /**
   * @param {function} broadcastUpdate Function to send updates to clients.
   */
  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.state = createInitialTimerState()
    this.broadcastUpdate = broadcastUpdate
  }

  /**
   * Returns the public-facing state of the timer.
   * @returns {TimerData} The current timer data.
   */
  public getState(): TimerData {
    return {
      isRunning: this.state.isRunning,
      currentPhase: this.state.currentPhase,
      timeRemaining: this.state.timeRemaining,
      timeElapsed: this.state.timeElapsed,
      caloriesBurned: 0, // Placeholder
      mode: this.state.mode,
      workDuration: this.state.workDuration,
      restDuration: this.state.restDuration,
      ...(this.state.soundToPlay !== undefined && {
        soundToPlay: this.state.soundToPlay,
      }),
      soundEventId: this.state.soundEventId,
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

  /**
   * Sets the timer's operational mode.
   * @param {TimerMode} mode The new mode.
   */
  public setMode(mode: TimerMode): void {
    if (this.state.isRunning) this.stop()

    this.state.mode = mode
    this.state.currentPhase = 'IDLE'
    this.state.timeRemaining = mode === 'TABATA' ? this.state.workDuration : 0
    this.state.timeElapsed = 0
    this.state.soundToPlay = undefined
    this.resetCountdownMarker()
    this.broadcastState()
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
    this.state.workDuration = Math.floor(config.workDuration)
    this.state.restDuration = Math.floor(config.restDuration)

    if (!this.state.isRunning && this.state.mode === 'TABATA') {
      this.state.timeRemaining = this.state.workDuration
    }

    this.broadcastState()
  }

  public dispose(): void {
    if (this.state._timerInterval) {
      clearInterval(this.state._timerInterval)
      this.state._timerInterval = null
    }
  }

  // --- Internal Logic Methods ---

  private start(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    const now = Date.now()

    if (this.state.currentPhase === 'IDLE') {
      this.state.currentPhase = 'PREPARE'
      this.state.timeRemaining = START_COUNTDOWN_DURATION
      this.state._phaseStartTime = now
      this.state._phaseTotalDuration = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    } else {
      // Resuming logic
      if (
        this.state.mode === 'STOPWATCH' &&
        this.state.currentPhase === 'RUNNING'
      ) {
        // Resume stopwatch: adjust start time by previously elapsed duration
        this.state._startTime = now - this.state._pausedElapsedTime * 1000
      } else {
        // Resume TABATA phase or PREPARE: adjust phase start time
        // so that (now - start) / 1000 = elapsed
        // and elapsed = total - remaining
        const remaining = this.state._pausedRemainingTime
        const duration = this.state._phaseTotalDuration
        const elapsed = duration - remaining
        this.state._phaseStartTime = now - elapsed * 1000
      }
    }

    this.state._timerInterval = setInterval(this.updateTimer, TIMER_INTERVAL)
    this.broadcastState()
  }

  private pause(): void {
    if (!this.state.isRunning) return

    this.state.isRunning = false
    if (this.state._timerInterval) {
      clearInterval(this.state._timerInterval)
      this.state._timerInterval = null
    }

    // Capture state for resumption
    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      this.state._pausedElapsedTime = this.state.timeElapsed
      this.state._startTime = null
    } else {
      // TABATA phases or PREPARE
      this.state._pausedRemainingTime = this.state.timeRemaining
      this.state._phaseStartTime = null
    }

    this.broadcastState()
  }

  private stop(): void {
    if (this.state._timerInterval) {
      clearInterval(this.state._timerInterval)
      this.state._timerInterval = null
    }

    this.state.isRunning = false
    this.state.currentPhase = 'IDLE'
    this.state.timeElapsed = 0
    this.state.timeRemaining =
      this.state.mode === 'TABATA' ? this.state.workDuration : 0
    this.state.soundToPlay = undefined

    this.resetCountdownMarker()
    this.state._pausedElapsedTime = 0
    this.state._pausedRemainingTime = 0
    this.state._startTime = null
    this.state._phaseStartTime = null
    this.state._phaseTotalDuration = 0

    this.broadcastState()
  }

  private updateTimer = (): void => {
    if (!this.state.isRunning) return

    const now = Date.now()

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      if (this.state._startTime) {
        const currentDelta = Math.floor((now - this.state._startTime) / 1000)
        this.state.timeElapsed = currentDelta
      }
    } else {
      // TABATA phases or PREPARE
      if (this.state._phaseStartTime) {
        const elapsed = (now - this.state._phaseStartTime) / 1000
        // Use Math.ceil for countdown display (e.g. 4.9s -> 5s)
        const remaining = Math.max(
          0,
          Math.ceil(this.state._phaseTotalDuration - elapsed)
        )
        this.state.timeRemaining = remaining

        if (remaining <= 0) {
          this.transitionPhase()
        } else {
          this.handleCountdownCue()
        }
      }
    }

    this.broadcastState()
  }

  private transitionPhase(): void {
    this.resetCountdownMarker()
    const now = Date.now()

    switch (this.state.currentPhase) {
      case 'PREPARE':
        this.queueSound('WORK')
        if (this.state.mode === 'STOPWATCH') {
          this.state.currentPhase = 'RUNNING'
          this.state.timeElapsed = 0
          this.state._pausedElapsedTime = 0
          this.state._startTime = now
        } else {
          this.state.currentPhase = 'WORK'
          this.state.timeRemaining = this.state.workDuration
          this.state._phaseStartTime = now
          this.state._phaseTotalDuration = this.state.workDuration
        }
        break

      case 'WORK':
        this.queueSound('REST')
        this.state.currentPhase = 'REST'
        this.state.timeRemaining = this.state.restDuration
        this.state._phaseStartTime = now
        this.state._phaseTotalDuration = this.state.restDuration
        break

      case 'REST':
        this.queueSound('WORK')
        this.state.currentPhase = 'WORK'
        this.state.timeRemaining = this.state.workDuration
        this.state._phaseStartTime = now
        this.state._phaseTotalDuration = this.state.workDuration
        break

      default:
        this.stop()
        break
    }
  }

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN'): void {
    this.state.soundToPlay = sound
    this.state.soundEventId += 1
    // Broadcast immediately to ensure sound plays
    this.broadcastState()
  }

  private resetCountdownMarker(): void {
    this.state._countdownMarker = null
  }

  private handleCountdownCue(): void {
    const phase = this.state.currentPhase
    const remaining = this.state.timeRemaining
    if (
      phase === 'IDLE' ||
      phase === 'RUNNING' ||
      phase === 'COOLDOWN' ||
      remaining <= 0
    ) {
      return
    }

    const marker = `${phase}-${remaining}`
    if (remaining <= 3 && this.state._countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.state._countdownMarker = marker
    }
  }

  private broadcastState(): void {
    this.broadcastUpdate({
      type: 'TIMER_UPDATE',
      payload: this.getState(),
    })
  }
}

export default TabataTimer
