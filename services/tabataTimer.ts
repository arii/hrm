// File: services/tabataTimer.ts
/**
 * TabataTimer Service (CQRS Facade)
 *
 * This class acts as a facade for the timer system, cleanly separating commands (mutations)
 * from queries (state retrieval). It orchestrates the timer's lifecycle by dispatching
 * events to an event store and managing the timer interval (`setInterval`).
 *
 * It does not contain any core state logic itself. All state management is delegated
 * to the `timerReducer` via the `TimerEventStore`.
 */
import { ServerMessage } from '../types/websocket'
import { TimerData, TimerMode } from '../types/core'
import { TimerEventStore } from './timer/eventStore'

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

class TabataTimer {
  private eventStore: TimerEventStore
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Includes a universal 5-second
 * PREPARE countdown that runs before both modes begin.
 * Emits 'update' and 'phaseChange' events.
 */
import { EventEmitter } from 'events'
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

class TabataTimer extends EventEmitter {
  private timerInterval: NodeJS.Timeout | null = null

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.eventStore = new TimerEventStore(broadcastUpdate)
  constructor() {
    super()
  }

  private queueSound(sound: 'WORK' | 'REST' | 'COUNTDOWN') {
    this.timerState.soundToPlay = sound
    this.timerState.soundEventId += 1
    // Emit an update event immediately so clients can play sound
    this.emit('update', this.getState())
  }

  // --- QUERIES ---

  /**
   * Retrieves the current public state of the timer from the event store.
   * This is a read-only operation.
   * @returns {TimerData} The current timer data.
   */
  public getState(): TimerData {
    const state = this.eventStore.getState()
    return {
      isRunning: state.isRunning,
      currentPhase: state.currentPhase,
      timeRemaining: state.timeRemaining,
      timeElapsed: state.timeElapsed,
      caloriesBurned: 0, // Placeholder
      mode: state.mode,
      workDuration: state.workDuration,
      restDuration: state.restDuration,
      ...(state.soundToPlay !== undefined && {
        soundToPlay: state.soundToPlay,
      }),
      soundEventId: state.soundEventId,
    }
  }

  // --- COMMANDS ---

  /**
   * Handles timer commands ('START', 'PAUSE', 'STOP') by dispatching
   * the corresponding events to the event store.
   * @param {TimerCommand} command - The command to execute.
   */
  public handleCommand(command: TimerCommand): void {
    switch (command) {
      case 'START':
        this.startTimer()
        break
      case 'PAUSE':
        this.eventStore.dispatch({ type: 'PAUSE_TIMER' })
        this.stopTickInterval()
        break
      case 'STOP':
        this.eventStore.dispatch({ type: 'STOP_TIMER' })
        this.stopTickInterval()
        break
      default:
        console.warn(`Unknown timer command: ${command}`)
    }
  }

  /**
   * Updates the timer's configuration by dispatching a 'CONFIGURE_TIMER' event.
   * @param {object} config - The new configuration.
   * @param {number} config.workDuration - The work duration in seconds.
   * @param {number} config.restDuration - The rest duration in seconds.
   */
  public setConfig(config: {
    workDuration: number
    restDuration: number
  }): void {
    this.eventStore.dispatch({
      type: 'CONFIGURE_TIMER',
      payload: config,
    })
  }

  /**
   * Changes the timer's mode ('TABATA' or 'STOPWATCH') by dispatching a 'SET_MODE' event.
   * The timer will be stopped before the mode is changed.
   * @param {TimerMode} mode - The new timer mode.
   */
  public setMode(mode: TimerMode): void {
    this.stopTickInterval() // Ensure timer is stopped before mode change
    this.eventStore.dispatch({ type: 'SET_MODE', mode })

    this.emit('update', this.getState())
  }

  private startTimer() {
    if (this.timerState.isRunning) return

    this.timerState.isRunning = true
    this.startTime = Date.now()

    // --- UNIVERSAL PREPARE LOGIC ---
    // If starting from IDLE, always begin with the PREPARE countdown.
    if (this.timerState.currentPhase === 'IDLE') {
      this.timerState.currentPhase = 'PREPARE'
      this.emit('phaseChange', this.timerState.currentPhase)
      this.timerState.timeRemaining = START_COUNTDOWN_DURATION
      this.resetCountdownMarker()
    }
    // If resuming after PAUSE, restore previous state (no PREPARE)
    // Note: For Stopwatch, pausedElapsedTime is used to resume count up.

    this.timerInterval = setInterval(this.updateTimer, 1000)
    this.emit('update', this.getState())
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

    this.emit('update', this.getState())
  }

  // --- INTERNAL LOGIC ---

  /**
   * Starts the timer by dispatching a 'START_TIMER' event and initiating the tick interval.
   */
  private startTimer(): void {
    // Dispatch the start event. The reducer will handle the state transition.
    this.eventStore.dispatch({ type: 'START_TIMER', startTime: Date.now() })
    this.startTickInterval()
    this.emit('update', this.getState())
  }

  /**
   * Manages the timer's tick interval. It dispatches a 'TICK' event every second.
   */
  private tick = (): void => {
    // Only dispatch a tick if the timer is running.
    if (this.eventStore.getState().isRunning) {
      this.eventStore.dispatch({ type: 'TICK' })
    } else {
      // If the timer is no longer running, stop the interval.
      this.stopTickInterval()
    }
  }

  /**
   * Starts the `setInterval` for the timer ticks if it's not already running.
   */
  private startTickInterval(): void {
    if (!this.timerInterval) {
      this.timerInterval = setInterval(this.tick, 1000)

    this.emit('update', this.getState())
  }

  // --- Universal Transition Logic ---

  private transitionPhase() {
    this.resetCountdownMarker()
    const previousPhase = this.timerState.currentPhase
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
    // If the phase has changed, emit an event
    if (this.timerState.currentPhase !== previousPhase) {
      this.emit('phaseChange', this.timerState.currentPhase)
    }
  }

  /**
   * Clears the `setInterval` for the timer ticks.
   */
  private stopTickInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
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
    this.emit('update', this.getState())
  }
}

export default TabataTimer
