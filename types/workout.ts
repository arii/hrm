export type WorkoutStatus = 'idle' | 'running' | 'paused' | 'finished'

/**
 * DTO for workout table data.
 * Contains only the first row as headers per simplified requirements.
 */
export interface WorkoutTableDto {
  headers: string[]
  rows: { cells: string[] }[]
}
