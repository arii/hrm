// File: services/timer/tabataTimer.ts
/**
 * Main service class for the dual-mode timer. This class is responsible for
 * managing the timer's lifecycle, handling side effects (like setInterval),
 * and dispatching actions to the event store. It connects the timer's state
 * management with the application's broadcast system.
 */
import { ServerMessage } from '../../types/websocket'
import { TimerEventStore } from '@/services/timer/eventStore'
import { TimerCommand, TimerMode, TimerConfig, TimerState } from './types'

// The TabataTimer class orchestrates the timer's functionality.
export class TabataTimer {
  // The event store that manages the timer's state.
  private store = new TimerEventStore()
  // The interval ID for the timer's tick.
  private timerInterval: NodeJS.Timeout | null = null
  // Function to broadcast updates to all clients.
  private broadcastUpdate: (message: ServerMessage) => void

  /**
   * Constructs a new TabataTimer instance.
   * @param broadcastUpdate - The function to call to broadcast updates.
   */
  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    // Subscribe to state changes and broadcast them.
    this.store.subscribe((state) => {
      this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: state })
      // If the timer is running and there's no interval, start one.
      if (state.isRunning && !this.timerInterval) {
        this.startTicking()
      }
      // If the timer is not running and there's an interval, stop it.
      if (!state.isRunning && this.timerInterval) {
        this.stopTicking()
      }
    })
  }

  // --- Public API ---

  /**
   * Returns the current state of the timer.
   * @returns The current timer state.
   */
  public getState(): TimerState {
    return this.store.getState()
  }

  /**
   * Handles a command to control the timer.
   * @param command - The command to handle.
   */
  public handleCommand(command: TimerCommand): void {
    this.store.dispatch({ type: command })
  }

  /**
   * Sets the timer's mode (Tabata or Stopwatch).
   * @param mode - The mode to set.
   */
  public setMode(mode: TimerMode): void {
    this.store.dispatch({ type: 'SET_MODE', mode })
  }

  /**
   * Sets the timer's configuration (work and rest durations).
   * @param config - The configuration to set.
   */
  public setConfig(config: TimerConfig): void {
    this.store.dispatch({
      type: 'SET_CONFIG',
      workDuration: config.workDuration,
      restDuration: config.restDuration,
    })
  }

  // --- Private Methods ---

  /**
   * Starts the timer's tick interval.
   */
  private startTicking(): void {
    if (this.timerInterval) return
    this.timerInterval = setInterval(() => {
      this.store.dispatch({ type: 'TICK' })
    }, 1000)
  }

  /**
   * Stops the timer's tick interval.
   */
  private stopTicking(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
}

export default TabataTimer
