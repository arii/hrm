// types/service.ts
import type { SpotifyService } from './interfaces.js'
import type TabataTimer from '../services/tabataTimer.js'
import type { WorkoutHistoryService } from '../services/workoutHistoryService.js'

// Define a type for the service registry
export interface ServiceRegistry {
  spotifyService: SpotifyService
  tabataService: TabataTimer
  workoutHistoryService: WorkoutHistoryService
}

export interface AppServices extends ServiceRegistry {
  isSpotifyInitialized: boolean
}
