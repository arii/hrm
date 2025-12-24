// File: services/tabataTimer.ts
/**
 * Orchestrates the Timer Service using a CQRS-like pattern.
 * - Manages the timer's state instance.
 * - Delegates state mutations to TimerCommands.
 * - Delegates state reads to TimerQueries.
 * This separation simplifies the logic and aligns with the Command Query Separation principle.
 */

import { ServerMessage } from '../types/websocket'
import { TimerData, TimerMode } from '../types/core'
import TimerQueries from './timer/timerQueries'
import TimerCommands from './timer/timerCommands'
import {
  createInitialTimerState,
  DualModeTimerState,
} from './timer/timerState'

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

class TabataTimer {
  private state: DualModeTimerState
  public queries: TimerQueries
  private commands: TimerCommands

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.state = createInitialTimerState()
    this.queries = new TimerQueries(this.state)
    this.commands = new TimerCommands(this.state, broadcastUpdate, this.queries)
  }

  // --- Public API for Interaction ---

  /**
   * Retrieves the current state of the timer for broadcasting or direct query.
   * This is a read-only operation.
   * @returns The current timer data.
   */
  public getState(): TimerData {
    return this.queries.getState()
  }

  /**
   * Sets the configuration for the Tabata timer (work and rest durations).
   * This is a write operation.
   * @param config - The new configuration settings.
   */
  public setConfig(config: { workDuration: number; restDuration: number }): void {
    this.commands.setConfig(config)
  }

  /**
   * Switches the timer mode between 'TABATA' and 'STOPWATCH'.
   * This is a write operation.
   * @param mode - The new timer mode.
   */
  public setMode(mode: TimerMode): void {
    this.commands.setMode(mode)
  }

  /**
   * Handles incoming timer commands ('START', 'PAUSE', 'STOP').
   * This is a write operation.
   * @param command - The command to execute.
   */
  public handleCommand(command: TimerCommand): void {
    switch (command) {
      case 'START':
        this.commands.start()
        break
      case 'PAUSE':
        this.commands.pause()
        break
      case 'STOP':
        this.commands.stop()
        break
      default:
        console.warn(`Unknown timer command: ${command}`)
    }
  }

  /**
   * Cleans up resources, specifically the timer interval, to prevent memory leaks.
   * This should be called when the timer is no longer needed.
   */
  public dispose(): void {
    if (this.state._timerInterval) {
      clearInterval(this.state._timerInterval)
    }
  }
}

export default TabataTimer
