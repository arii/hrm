// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Includes a universal 5-second
 * PREPARE countdown that runs before both modes begin.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import {
  HrmData,
  ServerMessage,
  TimerData,
  TimerMode,
  TimerPhase,
} from '../types/websocket'
import { CALORIE_DEFAULTS } from '../utils/constants.js'

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
  totalCaloriesBurned: number
}

class TabataTimer {
  // Function provided by server.ts to push updates to all clients
  private broadcastUpdate: (message: ServerMessage) => void
  private timerInterval: NodeJS.Timeout | null = null
  private startTime: number | null = null
  private pausedElapsedTime: number = 0 // Stored elapsed time when paused (in seconds)
  private clientSessionState: Map<
    string,
    { lastUpdate: number; accumulatedCalories: number }
  >

  private timerState: DualModeTimerState = {
    mode: 'TABATA', // Default mode
    isRunning: false,
    currentPhase: 'IDLE',
    timeElapsed: 0,
    timeRemaining: 0,
    workDuration: DEFAULT_WORK_DURATION,
    restDuration: DEFAULT_REST_DURATION,
    soundEventId: 0,
    totalCaloriesBurned: 0,
  }

  private countdownMarker: string | null = null

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    this.clientSessionState = new Map()
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
      caloriesBurned: this.timerState.totalCaloriesBurned,
      mode: this.timerState.mode,
      workDuration: this.timerState.workDuration,
      restDuration: this.timerState.restDuration,
      ...(this.timerState.soundToPlay !== undefined && {
        soundToPlay: this.timerState.soundToPlay,
      }),
      soundEventId: this.timerState.soundEventId,
    }
  }

  // --- Calorie Calculation ---
  public updateHrmData(clientData: Map<string, HrmData>): Map<string, HrmData> {
    const now = Date.now()
    let totalCalories = 0
    const updatedClientData = new Map<string, HrmData>()

    clientData.forEach((client, clientId) => {
      if (!this.clientSessionState.has(clientId)) {
        this.clientSessionState.set(clientId, {
          lastUpdate: now,
          accumulatedCalories: 0,
        })
      }

      const sessionState = this.clientSessionState.get(clientId)!
      const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
      sessionState.lastUpdate = now

      const currentHr = client.value ?? 0
      const currentAge = client.age ?? 30

      if (
        this.timerState.isRunning &&
        currentHr > 30 &&
        dtMinutes > 0 &&
        dtMinutes < 5
      ) {
        const rate =
          (-CALORIE_DEFAULTS.INTERCEPT +
            CALORIE_DEFAULTS.FACTOR_HR * currentHr +
            CALORIE_DEFAULTS.FACTOR_WEIGHT * CALORIE_DEFAULTS.WEIGHT_KG +
            CALORIE_DEFAULTS.FACTOR_AGE * currentAge) /
          CALORIE_DEFAULTS.JOULE_CONVERSION

        const safeRate = Math.max(0, rate)
        sessionState.accumulatedCalories += safeRate * dtMinutes
      }

      const updatedClient = {
        ...client,
        calories: Math.round(sessionState.accumulatedCalories * 10) / 10,
      }
      updatedClientData.set(clientId, updatedClient)
      totalCalories += sessionState.accumulatedCalories
    })

    this.timerState.totalCaloriesBurned = Math.floor(totalCalories)

    // Broadcast both HRM and Timer updates
    this.broadcastUpdate({
      type: 'HRM_UPDATE',
      payload: Array.from(updatedClientData.values()),
    })
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getState() })
    return updatedClientData
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

    // Reset calorie tracking
    this.timerState.totalCaloriesBurned = 0
    this.clientSessionState.clear()

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
