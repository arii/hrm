// File: services/timer/timerQueries.ts

import { TimerData } from '../../types/core'
import { DualModeTimerState } from './timerState.js'

/**
 * Handles read-only operations for the timer.
 * Methods in this class do not mutate the timer's state.
 */
class TimerQueries {
  private state: DualModeTimerState

  constructor(state: DualModeTimerState) {
    this.state = state
  }

  /**
   * Gets the current public state of the timer, formatted for client consumption.
   * @returns A TimerData object representing the current state.
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

export default TimerQueries
