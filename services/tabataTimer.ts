// File: services/tabataTimer.ts
/**
 * Orchestrator for the Dual-Mode Timer Service.
 * This class integrates the state, queries, and commands modules to provide a
 * cohesive public API for managing the timer. It delegates all logic to the
 * respective modules, acting as a facade.
 */
import { saveWorkout } from './workoutService.js'
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
  private readonly state: DualModeTimerState
  private readonly queries: TimerQueries
  private readonly commands: TimerCommands
  private userName: string = 'Unknown'

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
        this.saveWorkoutSession()
        break
      default:
        console.warn(`Unknown timer command: ${command}`)
    }
  }

  public setUserName(userName: string): void {
    this.userName = userName
  }

  private async saveWorkoutSession(): Promise<void> {
    const { timeElapsed } = this.queries.getState()
    if (timeElapsed > 0) {
      const workout = {
        id: new Date().toISOString(),
        startTime: Date.now() - timeElapsed * 1000,
        endTime: Date.now(),
        duration: timeElapsed,
        caloriesBurned: 0, // Placeholder for now
        userName: this.userName,
      }
      try {
        await saveWorkout(workout)
        console.log('Workout session saved successfully.')
      } catch (error) {
        console.error('Failed to save workout session:', error)
      }
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
