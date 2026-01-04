// services/workoutHistoryService.ts
import fs from 'fs/promises'
import path from 'path'
import { Workout, WorkoutHistory } from '../types/workout'

const LOGS_DIR = path.join(process.cwd(), 'logs')
const HISTORY_FILE_PATH = path.join(LOGS_DIR, 'workout-history.json')

export class WorkoutHistoryService {
  private workoutHistory: WorkoutHistory = []
  private initialized: Promise<void> // To track initialization status

  constructor() {
    this.initialized = this._initializeHistory() // Start initialization, store the promise
  }

  // Private method to handle the actual async initialization
  private async _initializeHistory(): Promise<void> {
    await fs.mkdir(LOGS_DIR, { recursive: true }) // Ensure logs directory exists
    try {
      const data = await fs.readFile(HISTORY_FILE_PATH, 'utf-8')
      this.workoutHistory = JSON.parse(data)
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        this.workoutHistory = []
        await this.saveHistory()
      } else {
        throw error
      }
    }
  }

  // Public method to await initialization completion
  public async ensureInitialized(): Promise<void> {
    await this.initialized
  }

  private async saveHistory(): Promise<void> {
    await fs.writeFile(
      HISTORY_FILE_PATH,
      JSON.stringify(this.workoutHistory, null, 2),
      'utf-8'
    )
  }

  public async getHistory(): Promise<WorkoutHistory> {
    await this.ensureInitialized() // Ensure service is ready
    return this.workoutHistory
  }

  public async getWorkoutById(id: string): Promise<Workout | undefined> {
    await this.ensureInitialized() // Ensure service is ready
    return this.workoutHistory.find((workout) => workout.id === id)
  }

  public async addWorkout(workout: Workout): Promise<Workout> {
    await this.ensureInitialized() // Ensure service is ready
    this.workoutHistory.push(workout)
    await this.saveHistory()
    return workout
  }

  public async updateWorkout(
    id: string,
    updatedWorkout: Partial<Workout>
  ): Promise<Workout | undefined> {
    await this.ensureInitialized() // Ensure service is ready
    const workoutIndex = this.workoutHistory.findIndex(
      (workout) => workout.id === id
    )
    if (workoutIndex === -1) {
      return undefined
    }

    const updatedWorkoutWithId = {
      ...this.workoutHistory[workoutIndex],
      ...updatedWorkout,
    } as Workout
    this.workoutHistory[workoutIndex] = updatedWorkoutWithId
    await this.saveHistory()
    return updatedWorkoutWithId
  }

  public async deleteWorkout(id: string): Promise<boolean> {
    await this.ensureInitialized() // Ensure service is ready
    const originalLength = this.workoutHistory.length
    this.workoutHistory = this.workoutHistory.filter(
      (workout) => workout.id !== id
    )
    if (this.workoutHistory.length < originalLength) {
      await this.saveHistory()
      return true
    }
    return false
  }
}
