// File: types/shared.ts
/**
 * Description: Defines common types, enums, and interfaces shared across
 * both the frontend and backend of the application. This ensures consistency
 * and type safety for data structures that are not specific to WebSocket
 * communication.
 */

/**
 * Represents the operational modes of the Tabata and Stopwatch timer.
 * - 'STOPWATCH': A simple count-up timer.
 * - 'TABATA': A high-intensity interval training (HIIT) timer with work and rest phases.
 */
export type TimerMode = 'STOPWATCH' | 'TABATA'

/**
 * Represents the distinct phases of the timer's lifecycle.
 * - 'IDLE': The timer is not active.
 * - 'PREPARE': A brief countdown before the 'WORK' phase begins.
 * - 'WORK': The active exercise interval.
 * - 'REST': The recovery interval between 'WORK' phases.
 * - 'COOLDOWN': A period of low-intensity activity after the main workout.
 * - 'RUNNING': The active state for the stopwatch mode.
 */
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'WORK'
  | 'REST'
  | 'COOLDOWN'
  | 'RUNNING'

/**
 * Defines the static, unchanging metadata for a connected Heart Rate Monitor (HRM) device.
 * This information is typically set once upon connection and does not change during the session.
 */
export interface HrmStaticMetadata {
  /**
   * A unique identifier for the client or device, managed by the server.
   */
  clientId: string
  /**
   * The user-configured maximum heart rate. Defaults to a standard formula if not provided.
   */
  maxHr: number
  /**
   * An optional, user-provided name for the device or workout session.
   */
  name?: string
  /**
   * The age of the user, used for more accurate calorie calculations.
   */
  age?: number
}
