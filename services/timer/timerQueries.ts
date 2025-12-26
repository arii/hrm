// File: services/timer/timerQueries.ts
/**
 * Provides read-only access to the timer's state, transforming the internal
 * state into the public `TimerData` format.
 */
import { TimerData } from '../../types/core.js'
import { DualModeTimerState } from './timerState.js'

export class TimerQueries {
  private state: DualModeTimerState

  /**
   * @param {DualModeTimerState} state The timer state object.
   */
  constructor(state: DualModeTimerState) {
    this.state = state
  }

  /**
   * Returns the public-facing state of the timer.
   * This method is a pure query and does not have side effects.
   * @returns {TimerData} The current state of the timer for client consumption.
   */
  public getState(): TimerData {
    return {
      isRunning: this.state.isRunning,
      currentPhase: this.state.currentPhase,
      timeRemaining: this.state.timeRemaining,
      timeElapsed: this.state.timeElapsed,
      caloriesBurned: 0, // Placeholder
      mode: this.state.mode,
      workDuration: this.state.workDuration,
      restDuration: this.state.restDuration,
      ...(this.state.soundToPlay !== undefined && {
        soundToPlay: this.state.soundToPlay,
      }),
      soundEventId: this.state.soundEventId,
    }
  }
}
