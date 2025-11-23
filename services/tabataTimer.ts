// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Includes a universal 5-second
 * PREPARE countdown that runs before both modes begin.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import {
  TimerData,
  TimerMode,
  TimerPhase,
  UnifiedStateMessage,
} from '../types/websocket'

// --- Tabata Constants ---
const DEFAULT_WORK_DURATION = 20 // seconds
const DEFAULT_REST_DURATION = 10 // seconds
const START_COUNTDOWN_DURATION = 5 // seconds (5-second countdown before WORK or RUNNING)

type TimerCommand = 'START' | 'PAUSE' | 'STOP'
type TimerConfig = { workDuration: number; restDuration: number }

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
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void
  private interval: NodeJS.Timeout | null = null
  private startTime: number | null = null
  private runningTotal: number = 0 // Stored elapsed time when paused (in seconds)

  private state: DualModeTimerState = {
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

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState
  }

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN'): void {
    this.state.soundToPlay = sound
    this.state.soundEventId += 1
    // Broadcast immediately so clients can play sound
    this.broadcastState({ timerData: this.getState() })
  }

  private resetCountdownMarker(): void {
    this.countdownMarker = null
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
    if (remaining >= 1 && remaining <= 3 && this.countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.countdownMarker = marker
    }
  }

  // Adapt getState to return the expected TimerData structure for the front-end
  public getState(): TimerData {
    return {
      isRunning: this.state.isRunning,
      currentPhase: this.state.currentPhase,
      timeRemaining: this.state.timeRemaining,
      timeElapsed: this.state.timeElapsed,
      mode: this.state.mode,
      workDuration: this.state.workDuration,
      restDuration: this.state.restDuration,
      soundToPlay: this.state.soundToPlay,
      soundEventId: this.state.soundEventId,
    }
  }

  // --- Core Timer Logic ---

  private tick = () => {
    if (!this.state.isRunning || !this.startTime) return

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      // COUNT UP (STOPWATCH)
      const currentDelta = Math.floor((Date.now() - this.startTime) / 1000)
      this.state.timeElapsed = this.runningTotal + currentDelta
    }

    // This applies to TABATA and PREPARE modes (which count down)
    if (this.state.mode === 'TABATA' || this.state.currentPhase === 'PREPARE') {
      const nextRemaining = Math.max(0, this.state.timeRemaining - 1)
      this.state.timeRemaining = nextRemaining

      if (nextRemaining <= 0) {
        this.transitionPhase()
      } else {
        this.handleCountdownCue()
      }
    }

    this.broadcastState({ timerData: this.getState() })
  }

  private startTimer(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.startTime = Date.now()

    // --- UNIVERSAL PREPARE LOGIC ---
    // If starting from IDLE, always begin with the PREPARE countdown.
    if (this.state.currentPhase === 'IDLE') {
      this.state.currentPhase = 'PREPARE'
      this.state.timeRemaining = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    }
    // If resuming after PAUSE, restore previous state (no PREPARE)
    // Note: For Stopwatch, runningTotal is used to resume count up.

    this.interval = setInterval(this.tick, 1000)
    this.broadcastState({ timerData: this.getState() })
  }

  private pauseTimer(): void {
    if (!this.state.isRunning || !this.startTime) return

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      this.runningTotal = this.state.timeElapsed // Save elapsed time
      this.state.currentPhase = 'IDLE' // Stopwatch sets to IDLE when paused
    }

    this.state.isRunning = false
    if (this.interval) clearInterval(this.interval)
    this.interval = null
    this.startTime = null

    this.broadcastState({ timerData: this.getState() })
  }

  private stopTimer(): void {
    if (this.interval) clearInterval(this.interval)

    // Full reset of all time and cycle variables
    this.state = {
      ...this.state,
      isRunning: false,
      currentPhase: 'IDLE',
      timeElapsed: 0,
      timeRemaining: this.state.mode === 'TABATA' ? this.state.workDuration : 0,
      soundToPlay: undefined,
    }
    this.resetCountdownMarker()
    this.runningTotal = 0
    this.startTime = null
    this.interval = null

    this.broadcastState({ timerData: this.getState() })
  }

  // --- Configuration ---
  public setConfig(config: TimerConfig): void {
    const sanitizedWork = Math.max(1, Math.floor(config.workDuration))
    const sanitizedRest = Math.max(0, Math.floor(config.restDuration))

    this.state.workDuration = sanitizedWork
    this.state.restDuration = sanitizedRest

    // If the timer is not running, update timeRemaining to reflect the new work duration.
    // This ensures the UI shows the correct starting time when settings are changed on an idle timer.
    if (!this.state.isRunning && this.state.mode === 'TABATA') {
      this.state.timeRemaining = sanitizedWork
    }

    this.broadcastState({ timerData: this.getState() })
  }

  // --- Universal Transition Logic ---

  private transitionPhase(): void {
    this.resetCountdownMarker()
    switch (this.state.currentPhase) {
      case 'PREPARE': // Transition from 5s countdown
        this.queueSound('WORK') // Long beep when starting
        if (this.state.mode === 'STOPWATCH') {
          // Start Stopwatch counting up
          this.state.currentPhase = 'RUNNING'
          this.state.timeElapsed = 0
          this.runningTotal = 0
          this.startTime = Date.now() // Reset start time for accurate count up
        } else {
          // Start Tabata WORK phase
          this.state.currentPhase = 'WORK'
          this.state.timeRemaining = this.state.workDuration
        }
        break

      case 'WORK':
        // Infinite loop: WORK -> REST
        this.queueSound('REST')
        this.state.currentPhase = 'REST'
        this.state.timeRemaining = this.state.restDuration
        break

      case 'REST':
        // Infinite loop: REST -> WORK
        this.queueSound('WORK')
        this.state.currentPhase = 'WORK'
        this.state.timeRemaining = this.state.workDuration
        break

      case 'IDLE':
      case 'COOLDOWN':
      case 'RUNNING':
        this.stopTimer()
        break
    }
  }

  // --- Command Handler (Used by socketManager) ---
  public handleCommand(command: TimerCommand): void {
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
  public setMode(mode: TimerMode): void {
    if (this.state.isRunning) this.stopTimer()
    this.state.mode = mode
    this.state.currentPhase = 'IDLE'
    this.state.timeRemaining = mode === 'TABATA' ? this.state.workDuration : 0
    this.state.timeElapsed = 0
    this.state.soundToPlay = undefined
    this.resetCountdownMarker()
    this.broadcastState({ timerData: this.getState() })
  }
}

export default TabataTimer
