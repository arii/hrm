// File: services/timer/eventStore.ts
/**
 * Manages the timer's state using an event-sourcing pattern.
 * It is the single source of truth for the timer's current state.
 *
 * Responsibilities:
 * - Holds the current state object.
 * - Provides a `dispatch` method to apply events to the state via the reducer.
 * - Broadcasts state updates to all clients after any state change.
 * - Maps the internal `TimerState` to the public `TimerData` format.
 */
import { ServerMessage } from '../../types/websocket'
import { TimerData } from '../../types/core'
import { TimerEvent, TimerState } from './types'
import { timerReducer, initialState } from './reducer'
import { DistributiveOmit } from '../../lib/utility-types' // Helper to Omit from a union

type BroadcastFunction = (message: ServerMessage) => void

export class TimerEventStore {
  private state: TimerState = initialState
  private broadcastUpdate: BroadcastFunction

  constructor(broadcastUpdate: BroadcastFunction) {
    this.broadcastUpdate = broadcastUpdate

    // Initialize state on creation
    this.state.timeRemaining = this.state.workDuration
  }

  /**
   * Dispatches an event to the reducer, updates the state, and broadcasts the change.
   * This is the only way to mutate the timer's state.
   * @param {TimerEvent} event - The event to process.
   */
  public dispatch(event: TimerEvent): void {
    const previousState = this.state
    const newState = timerReducer(previousState, event)

    // Only broadcast if the state has actually changed.
    if (newState !== previousState) {
      this.state = newState
      this.broadcast()
    }
  }

  /**
   * Returns the current state of the timer.
   * @returns {TimerState} The current timer state.
   */
  public getState(): TimerState {
    return this.state
  }

  /**
   * Converts the internal timer state to the public data format and broadcasts it.
   */
  private broadcast(): void {
    this.broadcastUpdate({
      type: 'TIMER_UPDATE',
      payload: this.getPublicState(),
    })
  }

  /**
   * Maps the internal `TimerState` to the public `TimerData` format expected by clients.
   * This ensures that internal state details (like `startTime`) are not exposed.
   * @returns {TimerData} The public-facing timer data.
   */
  private getPublicState(): TimerData {
    return {
      isRunning: this.state.isRunning,
      currentPhase: this.state.currentPhase,
      timeRemaining: this.state.timeRemaining,
      timeElapsed: this.state.timeElapsed,
      // TODO: Implement calorie estimation based on user data and heart rate
      caloriesBurned: 0,
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
