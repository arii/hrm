export type WorkoutStatus = 'idle' | 'running' | 'paused' | 'finished'

/**
 * Data Transfer Object for workout table data retrieved from a Google Doc.
 * This structure represents the parsed content of the first table found,
 * with headers and rows separated.
 */
export interface WorkoutTableDto {
  headers: string[]
  rows: string[][]
}

export interface WorkoutItem {
  category: string
  exercises: string[]
}
