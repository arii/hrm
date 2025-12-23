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
  private timerInterval: NodeJS.Timeout | null = null

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.eventStore = new TimerEventStore(broadcastUpdate)
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
  }

  // --- INTERNAL LOGIC ---

  /**
   * Starts the timer by dispatching a 'START_TIMER' event and initiating the tick interval.
   */
  private startTimer(): void {
    // Dispatch the start event. The reducer will handle the state transition.
    this.eventStore.dispatch({ type: 'START_TIMER', startTime: Date.now() })
    this.startTickInterval()
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
}

export default TabataTimer
