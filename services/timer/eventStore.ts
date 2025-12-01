// File: services/timer/eventStore.ts
/**
 * Manages the state of the timer service by using a reducer to handle actions.
 * It provides a way to dispatch actions, get the current state, and subscribe
 * to state changes. This is the core of the timer's state management.
 */
import { timerReducer, initialState, TimerAction } from './reducer'
import { TimerState } from './types'

// The TimerEventStore class manages the timer's state.
export class TimerEventStore {
  // The current state of the timer.
  private state: TimerState = initialState
  // A set of listeners that will be called whenever the state changes.
  private listeners: Set<(state: TimerState) => void> = new Set()

  /**
   * Dispatches an action to the timer's reducer to update the state.
   * After the state is updated, it notifies all listeners of the change.
   * @param action - The action to dispatch.
   */
  public dispatch(action: TimerAction): void {
    this.state = timerReducer(this.state, action)
    this.listeners.forEach((listener) => listener(this.state))
  }

  /**
   * Returns the current state of the timer.
   * @returns The current state of the timer.
   */
  public getState(): TimerState {
    return this.state
  }

  /**
   * Subscribes a listener function to be called whenever the state changes.
   * @param listener - The function to call when the state changes.
   * @returns A function to unsubscribe the listener.
   */
  public subscribe(listener: (state: TimerState) => void): () => void {
    this.listeners.add(listener)
    // Return an unsubscribe function.
    return () => this.listeners.delete(listener)
  }
}
