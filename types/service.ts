// types/service.ts
import type { SpotifyService } from './interfaces'
import type TabataTimer from '../services/tabataTimer'
import type { WorkoutHistoryService } from '../services/workoutHistoryService'

// Define a type for the service registry
export interface ServiceRegistry {
  spotifyService: SpotifyService
  tabataService: TabataTimer
  workoutHistoryService: WorkoutHistoryService
}

export interface AppServices extends ServiceRegistry {
  isSpotifyInitialized: boolean
}
