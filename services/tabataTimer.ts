// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Includes a universal 5-second
 * PREPARE countdown that runs before both modes begin.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import {
  ServerMessage,
  TimerData,
  TimerMode,
  TimerPhase,
} from '../types/websocket'

// --- Tabata Constants ---
const DEFAULT_WORK_DURATION = 20 // seconds
const DEFAULT_REST_DURATION = 10 // seconds
const START_COUNTDOWN_DURATION = 5 // seconds (5-second countdown before WORK or RUNNING)

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

// Internal state structure
interface DualModeTimerState {
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number // For Stopwatch mode
  timeRemaining: number // For Tabata mode
  workDuration: number // Configurable work duration
  restDuration: number // Configurable rest duration
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number
}

class TabataTimer {
  // Function provided by server.ts to push updates to all clients
  private broadcastUpdate: (message: ServerMessage) => void
  private timerInterval: NodeJS.Timeout | null = null
  private startTime: number | null = null
  private phaseStartTime: number | null = null
  private targetDuration: number = 0
  private pausedElapsedTime: number = 0 // Stored elapsed time when paused (in seconds)

  private timerState: DualModeTimerState = {
    mode: 'TABATA', // Default mode
    isRunning: false,
    currentPhase: 'IDLE',
    timeElapsed: 0,
    timeRemaining: 0,
    workDuration: DEFAULT_WORK_DURATION,
    restDuration: DEFAULT_REST_DURATION,
    soundEventId: 0,
  }

  private countdownMarker: string | null = null

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    this.timerState.timeRemaining = this.timerState.workDuration
  }

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN') {
    this.timerState.soundToPlay = sound
    this.timerState.soundEventId += 1
    // Broadcast immediately so clients can play sound
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private resetCountdownMarker() {
    this.countdownMarker = null
  }

  private handleCountdownCue() {
    const phase = this.timerState.currentPhase
    if (phase === 'IDLE' || phase === 'RUNNING' || phase === 'COOLDOWN') {
      return
    }

    const remaining = this.timerState.timeRemaining
    if (remaining <= 0) {
      return
    }

    // Build marker per phase + second to avoid replaying countdown in same second
    const marker = `${phase}-${remaining}`
    // Play short beep for countdown during PREPARE, WORK, and REST phases when 1-3 seconds remain
    if (remaining >= 1 && remaining <= 3 && this.countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.countdownMarker = marker
    }
  }

  // Adapt getState to return the expected TimerData structure for the front-end
  public getState(): TimerData {
    return {
      isRunning: this.timerState.isRunning,
      currentPhase: this.timerState.currentPhase,
      timeRemaining: this.timerState.timeRemaining,
      timeElapsed: this.timerState.timeElapsed,
      caloriesBurned: 0, // Placeholder
      mode: this.timerState.mode,
      workDuration: this.timerState.workDuration,
      restDuration: this.timerState.restDuration,
      ...(this.timerState.soundToPlay !== undefined && {
        soundToPlay: this.timerState.soundToPlay,
      }),
      soundEventId: this.timerState.soundEventId,
    }
  }

  // --- Core Timer Logic ---

  private updateTimer = () => {
    if (!this.timerState.isRunning || !this.phaseStartTime) return

    let hasChanged = false

    if (
      this.timerState.mode === 'STOPWATCH' &&
      this.timerState.currentPhase === 'RUNNING'
    ) {
      if (!this.startTime) return // Should not happen if running
      const currentDelta = Math.floor((Date.now() - this.startTime) / 1000)
      const newTimeElapsed = this.pausedElapsedTime + currentDelta
      if (this.timerState.timeElapsed !== newTimeElapsed) {
        this.timerState.timeElapsed = newTimeElapsed
        hasChanged = true
      }
    } else {
      const elapsedPhaseTime = Math.floor(
        (Date.now() - this.phaseStartTime) / 1000
      )
      const nextRemaining = Math.max(0, this.targetDuration - elapsedPhaseTime)

      if (this.timerState.timeRemaining !== nextRemaining) {
        this.timerState.timeRemaining = nextRemaining
        hasChanged = true
        if (nextRemaining <= 0) {
          this.transitionPhase()
          return // transitionPhase handles its own broadcast
        } else {
          this.handleCountdownCue()
        }
      }
    }

    if (hasChanged) {
      this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
    }
  }

  private startTimer() {
    if (this.timerState.isRunning) return
    this.timerState.isRunning = true
    const now = Date.now()

    if (this.timerState.currentPhase === 'IDLE') {
      this.startTime = now
      this.phaseStartTime = now
      this.timerState.currentPhase = 'PREPARE'
      this.targetDuration = START_COUNTDOWN_DURATION
      this.timerState.timeRemaining = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    } else {
      const timePausedMs = now - (this.phaseStartTime || now)
      this.startTime = (this.startTime || now) + timePausedMs
      this.phaseStartTime = now
    }

    if (
      this.timerState.mode === 'STOPWATCH' &&
      this.timerState.currentPhase !== 'PREPARE'
    ) {
      this.timerState.currentPhase = 'RUNNING'
    }

    if (this.timerInterval) clearInterval(this.timerInterval)
    this.timerInterval = setInterval(this.updateTimer, 250)
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private pauseTimer() {
    if (!this.timerState.isRunning) return

    this.updateTimer()

    if (
      this.timerState.mode === 'STOPWATCH' &&
      this.timerState.currentPhase === 'RUNNING'
    ) {
      this.pausedElapsedTime = this.timerState.timeElapsed
      this.timerState.currentPhase = 'IDLE'
    }

    this.timerState.isRunning = false
    this.phaseStartTime = Date.now()

    if (
      this.timerState.mode === 'TABATA' ||
      this.timerState.currentPhase === 'PREPARE'
    ) {
      this.targetDuration = this.timerState.timeRemaining
    }

    if (this.timerInterval) clearInterval(this.timerInterval)
    this.timerInterval = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval)

    this.timerState = {
      ...this.timerState,
      isRunning: false,
      currentPhase: 'IDLE',
      timeElapsed: 0,
      timeRemaining:
        this.timerState.mode === 'TABATA' ? this.timerState.workDuration : 0,
    }
    delete this.timerState.soundToPlay
    this.resetCountdownMarker()
    this.pausedElapsedTime = 0
    this.startTime = null
    this.phaseStartTime = null
    this.targetDuration = 0
    this.timerInterval = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  // --- Configuration ---
  public setConfig(config: { workDuration: number; restDuration: number }) {
    const sanitizedWorkDuration = Math.max(1, Math.floor(config.workDuration))
    const sanitizedRestDuration = Math.max(0, Math.floor(config.restDuration))

    this.timerState.workDuration = sanitizedWorkDuration
    this.timerState.restDuration = sanitizedRestDuration

    if (!this.timerState.isRunning && this.timerState.mode === 'TABATA') {
      this.timerState.timeRemaining = sanitizedWorkDuration
    }

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  // --- Universal Transition Logic ---

  private transitionPhase() {
    this.resetCountdownMarker()
    const now = Date.now()
    this.phaseStartTime = now

    switch (this.timerState.currentPhase) {
      case 'PREPARE':
        this.queueSound('WORK')
        if (this.timerState.mode === 'STOPWATCH') {
          this.timerState.currentPhase = 'RUNNING'
          this.timerState.timeElapsed = 0
          this.pausedElapsedTime = 0
          this.startTime = now
        } else {
          this.timerState.currentPhase = 'WORK'
          this.targetDuration = this.timerState.workDuration
        }
        break

      case 'WORK':
        this.queueSound('REST')
        this.timerState.currentPhase = 'REST'
        this.targetDuration = this.timerState.restDuration
        break

      case 'REST':
        this.queueSound('WORK')
        this.timerState.currentPhase = 'WORK'
        this.targetDuration = this.timerState.workDuration
        break

      case 'IDLE':
      case 'COOLDOWN':
      case 'RUNNING':
        this.stopTimer()
        return // stopTimer broadcasts, so no need for another one
    }
    this.updateTimer()
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  // --- Command Handler (Used by socketManager) ---
  public handleCommand(command: TimerCommand) {
    switch (command) {
      case 'START':
        this.startTimer()
        break
      case 'PAUSE':
        this.pauseTimer()
        break
      case 'STOP':
        this.stopTimer()
        break
      default:
        console.warn(`Unknown timer command: ${command}`)
    }
  }

  // --- Mode Switching ---
  public setMode(mode: TimerMode) {
    if (this.timerState.isRunning) this.stopTimer()
    this.timerState.mode = mode
    this.timerState.currentPhase = 'IDLE'
    this.timerState.timeRemaining =
      mode === 'TABATA' ? this.timerState.workDuration : 0
    this.timerState.timeElapsed = 0
    delete this.timerState.soundToPlay
    this.resetCountdownMarker()
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }
}

export default TabataTimer
