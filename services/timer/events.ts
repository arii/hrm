// File: services/timer/events.ts
import { TimerMode } from '../../types/websocket'

/**
 * @fileoverview Defines the events that can be dispatched to the timer event store.
 * This file serves as the single source of truth for all possible state transitions.
 */

/**
 * The base interface for all timer events, containing the event type and a timestamp.
 */
export interface TimerEventBase {
  type: string
  timestamp: number // Milliseconds since epoch
}

/**
 * Fired when the timer is started or resumed.
 */
export interface StartEvent extends TimerEventBase {
  type: 'START'
}

/**
 * Fired when the timer is paused.
 */
export interface PauseEvent extends TimerEventBase {
  type: 'PAUSE'
}

/**
 * Fired when the timer is stopped and reset to its initial state.
 */
export interface StopEvent extends TimerEventBase {
  type: 'STOP'
}

/**
 * Fired on every one-second interval when the timer is running.
 * This event drives the countdown and count-up logic.
 */
export interface TickEvent extends TimerEventBase {
  type: 'TICK'
}

/**
 * Fired when the timer's mode is changed (e.g., from 'TABATA' to 'STOPWATCH').
 */
export interface SetModeEvent extends TimerEventBase {
  type: 'SET_MODE'
  mode: TimerMode
}

/**
 * Fired when the timer's configuration (work and rest durations) is updated.
 */
export interface SetConfigEvent extends TimerEventBase {
  type: 'SET_CONFIG'
  workDuration: number
  restDuration: number
}

/**
 * A union of all possible timer events.
 * This allows for type-safe handling of events in the reducer.
 */
export type TimerEvent =
  | StartEvent
  | PauseEvent
  | StopEvent
  | TickEvent
  | SetModeEvent
  | SetConfigEvent
