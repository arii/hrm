export type WorkoutStatus = 'idle' | 'running' | 'paused' | 'finished'

/**
 * DTO for workout table data.
 * Contains headers and rows parsed from the document.
 */
export interface WorkoutTableDto {
  headers: string[]
  rows: string[][]
}
