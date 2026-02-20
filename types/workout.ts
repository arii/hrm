export type WorkoutStatus = 'idle' | 'running' | 'paused' | 'finished'

/**
 * Data Transfer Object for workout table data retrieved from a Google Doc.
 * This structure represents the parsed content of the first table found.
 * As per simplified requirements, it only contains the first row as headers.
 */
export interface WorkoutTableDto {
  headers: string[]
}
