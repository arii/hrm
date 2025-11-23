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
  private targetDuration: number = 0 // The duration of the current countdown phase

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

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN') {
    this.state.soundToPlay = sound
    this.state.soundEventId += 1
    // Broadcast immediately so clients can play sound
    this.broadcastState({ timerData: this.getState() })
  }

  private resetCountdownMarker() {
    this.countdownMarker = null
  }

  private handleCountdownCue() {
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

    const elapsedMs = Date.now() - this.startTime
    const elapsedSeconds = Math.floor(elapsedMs / 1000)

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      // COUNT UP (STOPWATCH)
      this.state.timeElapsed = this.runningTotal + elapsedSeconds
    }

    // This applies to TABATA and PREPARE modes (which count down)
    if (this.state.mode === 'TABATA' || this.state.currentPhase === 'PREPARE') {
      const timeRemaining = Math.max(
        0,
        this.targetDuration - (this.runningTotal + elapsedSeconds)
      )
      this.state.timeRemaining = timeRemaining

      if (timeRemaining <= 0) {
        this.transitionPhase()
      } else {
        this.handleCountdownCue()
      }
    }

    this.broadcastState({ timerData: this.getState() })

    // Self-adjusting timeout loop
    const nextTick = 1000 - (elapsedMs % 1000)
    this.interval = setTimeout(this.tick, nextTick)
  }

  private startTimer() {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.startTime = Date.now()

    // --- UNIVERSAL PREPARE LOGIC ---
    // Case 1: A completely fresh start for either mode.
    if (this.state.currentPhase === 'IDLE' && this.runningTotal === 0) {
      this.state.currentPhase = 'PREPARE'
      this.targetDuration = START_COUNTDOWN_DURATION
      this.state.timeRemaining = this.targetDuration
      this.resetCountdownMarker()
<<<<<<< HEAD
      console.log(
        `Starting universal PREPARE countdown for ${this.state.mode} mode.`
      )
      // Case 2: Resuming a paused Stopwatch.
    } else if (this.state.mode === 'STOPWATCH') {
      this.state.currentPhase = 'RUNNING'
      // Case 3: Resuming a paused Tabata.
    } else if (this.state.mode === 'TABATA') {
      this.targetDuration = this.state.timeRemaining
      this.runningTotal = 0
=======
>>>>>>> origin/leader
    }

    this.tick() // Start the loop immediately
    this.broadcastState({ timerData: this.getState() })
  }

  private pauseTimer() {
    if (!this.state.isRunning || !this.startTime) return

    if (
      this.state.mode === 'STOPWATCH' &&
      this.state.currentPhase === 'RUNNING'
    ) {
      this.runningTotal = this.state.timeElapsed // Save elapsed time
      this.state.currentPhase = 'IDLE'
    }

    this.state.isRunning = false
    if (this.interval) clearTimeout(this.interval)
    this.interval = null
    this.startTime = null

    this.broadcastState({ timerData: this.getState() })
  }

  private stopTimer() {
    if (this.interval) clearTimeout(this.interval)

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
  public setConfig(config: { workDuration: number; restDuration: number }) {
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

  private transitionPhase() {
    this.resetCountdownMarker()
    this.startTime = Date.now() // Reset start time for every new phase for accuracy
    this.runningTotal = 0 // Reset elapsed time for the new phase

    switch (this.state.currentPhase) {
      case 'PREPARE': // Transition from 5s countdown
        this.queueSound('WORK')
        if (this.state.mode === 'STOPWATCH') {
          this.state.currentPhase = 'RUNNING'
          this.state.timeElapsed = 0
<<<<<<< HEAD
          console.log('Transition from PREPARE to STOPWATCH RUNNING.')
=======
          this.runningTotal = 0
          this.startTime = Date.now() // Reset start time for accurate count up
>>>>>>> origin/leader
        } else {
          this.state.currentPhase = 'WORK'
<<<<<<< HEAD
          this.targetDuration = this.state.workDuration
          this.state.timeRemaining = this.targetDuration
          console.log('Transition from PREPARE to TABATA WORK.')
=======
          this.state.timeRemaining = this.state.workDuration
>>>>>>> origin/leader
        }
        break

      case 'WORK':
        this.queueSound('REST')
        this.state.currentPhase = 'REST'
<<<<<<< HEAD
        this.targetDuration = this.state.restDuration
        this.state.timeRemaining = this.targetDuration
        console.log('Transition to REST.')
=======
        this.state.timeRemaining = this.state.restDuration
>>>>>>> origin/leader
        break

      case 'REST':
        this.queueSound('WORK')
        this.state.currentPhase = 'WORK'
<<<<<<< HEAD
        this.targetDuration = this.state.workDuration
        this.state.timeRemaining = this.targetDuration
        console.log('Transition to WORK.')
=======
        this.state.timeRemaining = this.state.workDuration
>>>>>>> origin/leader
        break

      default:
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
