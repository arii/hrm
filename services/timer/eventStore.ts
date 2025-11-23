// File: services/timer/eventStore.ts
import { TimerEvent } from './events'
import { reducer, TimerState, initialState } from './reducer'
import { UnifiedStateMessage } from '../../types/websocket'

/**
 * @fileoverview Manages the storage, replay, and broadcasting of timer events.
 * This class is the central hub for all timer-related state changes.
 */

// Helper to omit a key from a union type while preserving the union structure
export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never

export class TimerEventStore {
  private events: TimerEvent[] = []
  private broadcast: (data: Partial<UnifiedStateMessage>) => void
  private currentState: TimerState

  /**
   * @param broadcast - A function that sends state updates to all clients.
   */
  constructor(broadcast: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcast = broadcast
    this.currentState = initialState
  }

  /**
   * Records a new event and broadcasts the resulting state change.
   * @param event - The event to record.
   */
  public record(event: DistributiveOmit<TimerEvent, 'timestamp'>): void {
    const fullEvent: TimerEvent = {
      ...event,
      timestamp: Date.now(),
    } as TimerEvent

    this.events.push(fullEvent)
    this.currentState = reducer(this.currentState, fullEvent)

    // Map the internal state to the public TimerData shape
    this.broadcast({
      timerData: {
        isRunning: this.currentState.isRunning,
        currentPhase: this.currentState.phase,
        timeRemaining: this.currentState.timeRemaining,
        timeElapsed: this.currentState.timeElapsed,
        mode: this.currentState.mode,
        workDuration: this.currentState.workDuration,
        restDuration: this.currentState.restDuration,
        soundToPlay: this.currentState.soundToPlay,
        soundEventId: this.currentState.soundEventId,
      },
    })
  }

  /**
   * Reconstructs the current state by applying all recorded events to the reducer.
   * @returns The current state of the timer.
   */
  public replay(): TimerState {
    this.currentState = this.events.reduce(reducer, initialState)
    return this.currentState
  }

  /**
   * Returns the current cached state.
   *
   * @returns The current state of the timer.
   */
  public getState(): TimerState {
    return this.currentState
  }
}
