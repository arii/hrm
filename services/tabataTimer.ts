// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). It leverages the high-accuracy GenericTimer
 * for its core timing logic to prevent time drift.
 */
import {
  ServerMessage,
  TimerData,
  TimerMode,
  TimerPhase,
} from '../types/websocket'
import GenericTimer from './genericTimer' // Leverage the high-accuracy generic timer

// --- Tabata Constants ---
const DEFAULT_WORK_DURATION_S = 20
const DEFAULT_REST_DURATION_S = 10
const PREPARE_DURATION_S = 5

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

// Internal state structure for the Tabata service
interface DualModeTimerState {
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number // For Stopwatch mode, in seconds
  timeRemaining: number // For Tabata/Prepare modes, in seconds
  workDuration: number // Configurable work duration, in seconds
  restDuration: number // Configurable rest duration, in seconds
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number
}

class TabataTimer {
  private broadcastUpdate: (message: ServerMessage) => void
  private currentTimer: GenericTimer | null = null // Manages the active timer instance

  private timerState: DualModeTimerState = {
    mode: 'TABATA',
    isRunning: false,
    currentPhase: 'IDLE',
    timeElapsed: 0,
    timeRemaining: 0,
    workDuration: DEFAULT_WORK_DURATION_S,
    restDuration: DEFAULT_REST_DURATION_S,
    soundEventId: 0,
  }

  // Prevents re-triggering countdown sounds within the same second
  private countdownMarker: string | null = null

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
  }

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN') {
    this.timerState.soundToPlay = sound
    this.timerState.soundEventId += 1
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private resetCountdownMarker() {
    this.countdownMarker = null
  }

  private handleCountdownCue() {
    const phase = this.timerState.currentPhase
    if (phase === 'IDLE' || phase === 'RUNNING') return

    const remaining = this.timerState.timeRemaining
    if (remaining <= 0) return

    const marker = `${phase}-${remaining}`
    if (remaining >= 1 && remaining <= 3 && this.countdownMarker !== marker) {
      this.queueSound('COUNTDOWN')
      this.countdownMarker = marker
    }
  }

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

  private createAndStartTimer(durationSeconds: number, isStopwatch = false) {
    this.currentTimer?.stop() // Stop any existing timer

    this.currentTimer = new GenericTimer({
      mode: isStopwatch ? 'STOPWATCH' : 'COUNTDOWN',
      durationMs: durationSeconds * 1000,
      onUpdate: (timerState) => {
        // This callback is the new high-accuracy update loop
        if (isStopwatch) {
          this.timerState.timeElapsed = Math.floor(timerState.elapsedMs / 1000)
        } else {
          this.timerState.timeRemaining = Math.ceil(timerState.remainingMs / 1000)
          this.handleCountdownCue()
        }

        if (timerState.phase === 'FINISHED') {
          this.transitionPhase()
        }

        this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
      },
    })

    this.currentTimer.start()
  }

  private startTimer() {
    if (this.timerState.isRunning) return

    this.timerState.isRunning = true

    if (this.timerState.currentPhase === 'IDLE') {
      // Start fresh with a PREPARE phase
      this.timerState.currentPhase = 'PREPARE'
      this.timerState.timeRemaining = PREPARE_DURATION_S
      this.resetCountdownMarker()
      this.createAndStartTimer(PREPARE_DURATION_S)
    } else {
      // This implies we are resuming from a paused state.
      this.currentTimer?.start()
    }
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private pauseTimer() {
    if (!this.timerState.isRunning) return

    this.timerState.isRunning = false
    this.currentTimer?.pause()
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private stopTimer() {
    this.currentTimer?.stop()
    this.currentTimer = null

    // Full reset
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
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  public setConfig(config: { workDuration: number; restDuration: number }) {
    this.timerState.workDuration = Math.max(1, Math.floor(config.workDuration))
    this.timerState.restDuration = Math.max(0, Math.floor(config.restDuration))

    if (!this.timerState.isRunning && this.timerState.mode === 'TABATA') {
      this.timerState.timeRemaining = this.timerState.workDuration
    }
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
  }

  private transitionPhase() {
    this.resetCountdownMarker()
    let nextPhaseDuration = 0

    switch (this.timerState.currentPhase) {
      case 'PREPARE':
        this.queueSound('WORK')
        if (this.timerState.mode === 'STOPWATCH') {
          this.timerState.currentPhase = 'RUNNING'
          this.createAndStartTimer(0, true) // Indefinite stopwatch
          return
        } else {
          this.timerState.currentPhase = 'WORK'
          nextPhaseDuration = this.timerState.workDuration
        }
        break
      case 'WORK':
        this.queueSound('REST')
        this.timerState.currentPhase = 'REST'
        nextPhaseDuration = this.timerState.restDuration
        break
      case 'REST':
        this.queueSound('WORK')
        this.timerState.currentPhase = 'WORK'
        nextPhaseDuration = this.timerState.workDuration
        break
      default:
        this.stopTimer()
        return
    }

    if (nextPhaseDuration > 0) {
      this.timerState.timeRemaining = nextPhaseDuration
      this.createAndStartTimer(nextPhaseDuration)
    } else {
      this.transitionPhase() // e.g., for 0-second rest intervals
    }
  }

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
    }
  }

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
