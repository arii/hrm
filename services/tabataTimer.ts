// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Includes a universal 5-second
 * PREPARE countdown that runs before both modes begin.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import { ServerMessage } from '../types/websocket'
import { TimerData, TimerMode, TimerPhase } from '../types/core'

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
    if (!this.timerState.isRunning || !this.startTime) return

    if (
      this.timerState.mode === 'STOPWATCH' &&
      this.timerState.currentPhase === 'RUNNING'
    ) {
      // COUNT UP (STOPWATCH)
      const currentDelta = Math.floor((Date.now() - this.startTime) / 1000)
      this.timerState.timeElapsed = this.pausedElapsedTime + currentDelta
    }

    // This applies to TABATA and PREPARE modes (which count down)
    if (
      this.timerState.mode === 'TABATA' ||
      this.timerState.currentPhase === 'PREPARE'
    ) {
      const nextRemaining = Math.max(0, this.timerState.timeRemaining - 1)
      this.timerState.timeRemaining = nextRemaining

      if (nextRemaining <= 0) {
        this.transitionPhase()
      } else {
        this.handleCountdownCue()
      }
    }

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private startTimer() {
    if (this.timerState.isRunning) return

    this.timerState.isRunning = true
    this.startTime = Date.now()

    // --- UNIVERSAL PREPARE LOGIC ---
    // If starting from IDLE, always begin with the PREPARE countdown.
    if (this.timerState.currentPhase === 'IDLE') {
      this.timerState.currentPhase = 'PREPARE'
      this.timerState.timeRemaining = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    }
    // If resuming after PAUSE, restore previous state (no PREPARE)
    // Note: For Stopwatch, pausedElapsedTime is used to resume count up.

    this.timerInterval = setInterval(this.updateTimer, 1000)
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private pauseTimer() {
    if (!this.timerState.isRunning || !this.startTime) return

    if (
      this.timerState.mode === 'STOPWATCH' &&
      this.timerState.currentPhase === 'RUNNING'
    ) {
      this.pausedElapsedTime = this.timerState.timeElapsed // Save elapsed time
      this.timerState.currentPhase = 'IDLE' // Stopwatch sets to IDLE when paused
    }

    this.timerState.isRunning = false
    if (this.timerInterval) clearInterval(this.timerInterval)
    this.timerInterval = null
    this.startTime = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval)

    // Full reset of all time and cycle variables
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
    this.timerInterval = null

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  // --- Configuration ---
  public setConfig(config: { workDuration: number; restDuration: number }) {
    const sanitizedWorkDuration = Math.max(1, Math.floor(config.workDuration))
    const sanitizedRestDuration = Math.max(0, Math.floor(config.restDuration))

    this.timerState.workDuration = sanitizedWorkDuration
    this.timerState.restDuration = sanitizedRestDuration

    // If the timer is not running, update timeRemaining to reflect the new work duration.
    // This ensures the UI shows the correct starting time when settings are changed on an idle timer.
    if (!this.timerState.isRunning && this.timerState.mode === 'TABATA') {
      this.timerState.timeRemaining = sanitizedWorkDuration
    }

    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  // --- Universal Transition Logic ---

  private transitionPhase() {
    this.resetCountdownMarker()
    switch (this.timerState.currentPhase) {
      case 'PREPARE': // Transition from 5s countdown
        this.queueSound('WORK') // Long beep when starting
        if (this.timerState.mode === 'STOPWATCH') {
          // Start Stopwatch counting up
          this.timerState.currentPhase = 'RUNNING'
          this.timerState.timeElapsed = 0
          this.pausedElapsedTime = 0
          this.startTime = Date.now() // Reset start time for accurate count up
        } else {
          // Start Tabata WORK phase
          this.timerState.currentPhase = 'WORK'
          this.timerState.timeRemaining = this.timerState.workDuration
        }
        break

      case 'WORK':
        // Infinite loop: WORK -> REST
        this.queueSound('REST')
        this.timerState.currentPhase = 'REST'
        this.timerState.timeRemaining = this.timerState.restDuration
        break

      case 'REST':
        // Infinite loop: REST -> WORK
        this.queueSound('WORK')
        this.timerState.currentPhase = 'WORK'
        this.timerState.timeRemaining = this.timerState.workDuration
        break

      case 'IDLE':
      case 'COOLDOWN':
      case 'RUNNING':
        this.stopTimer()
        break
    }
  }

  // --- Command Handler (Used by socketManager) ---
  public handleCommand(command: TimerCommand) {
    switch (command) {
      case 'START':
        // START now triggers PREPARE if in IDLE
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
