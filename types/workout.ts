export type WorkoutStatus = 'idle' | 'running' | 'paused' | 'finished'

/**
 * DTO for workout table data.
 * headers: timing protocol per phase (first line of each doc column).
 * columns: exercise lists per phase; each column renders as one cell with
 * its exercises flowing inside (no cross-column row alignment).
 */
export interface WorkoutTableDto {
  headers: string[]
  columns: string[][]
}
