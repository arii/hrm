// File: services/tabataTimer.ts
/**
 * Orchestrator for the Dual-Mode Timer Service.
 * This class integrates the state, queries, and commands modules to provide a
 * cohesive public API for managing the timer. It delegates all logic to the
 * respective modules, acting as a facade.
 */
import { ServerMessage } from '../types/websocket'
import { TimerData, TimerMode } from '../types/core'
import {
  createInitialTimerState,
  DualModeTimerState,
} from './timer/timerState.js'
import { TimerQueries } from './timer/timerQueries.js'
import { TimerCommands } from './timer/timerCommands.js'

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

class TabataTimer {
  private state: DualModeTimerState
  private queries: TimerQueries
  private commands: TimerCommands

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.state = createInitialTimerState()
    this.queries = new TimerQueries(this.state)
    this.commands = new TimerCommands(this.state, broadcastUpdate, this.queries)
  }

  /**
   * Returns the public-facing state of the timer.
   * @returns {TimerData} The current timer data.
   */
  public getState(): TimerData {
    return this.queries.getState()
  }

  /**
   * Handles incoming commands from clients.
   * @param {TimerCommand} command The command to execute.
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
   * Sets the timer's operational mode.
   * @param {TimerMode} mode The new mode.
   */
  public setMode(mode: TimerMode): void {
    this.commands.setMode(mode)
  }

  /**
   * Configures the durations for the TABATA mode.
   * @param {object} config The new configuration.
   */
  public setConfig(config: {
    workDuration: number
    restDuration: number
  }): void {
    this.commands.setConfig(config)
  }

  /**
   * Cleans up resources, specifically the timer interval, to prevent memory leaks.
   */
  public dispose(): void {
    this.commands.dispose()
  }
}

export default TabataTimer
