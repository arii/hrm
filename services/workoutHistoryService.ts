// services/workoutHistoryService.ts
import fs from 'fs/promises'
import path from 'path'
import { Workout, WorkoutHistory } from '../types/workout'

const HISTORY_FILE_PATH = path.join(
  process.cwd(),
  'logs',
  'workout-history.json'
)

export class WorkoutHistoryService {
  private workoutHistory: WorkoutHistory = []

  constructor() {
    this.loadHistory().catch((err) =>
      console.error('Failed to load workout history:', err)
    )
  }

  private async loadHistory(): Promise<void> {
    try {
      const data = await fs.readFile(HISTORY_FILE_PATH, 'utf-8')
      this.workoutHistory = JSON.parse(data)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        this.workoutHistory = []
        await this.saveHistory()
      } else {
        throw error
      }
    }
  }

  private async saveHistory(): Promise<void> {
    await fs.writeFile(
      HISTORY_FILE_PATH,
      JSON.stringify(this.workoutHistory, null, 2),
      'utf-8'
    )
  }

  public async getHistory(): Promise<WorkoutHistory> {
    return this.workoutHistory
  }

  public async getWorkoutById(id: string): Promise<Workout | undefined> {
    return this.workoutHistory.find((workout) => workout.id === id)
  }

  public async addWorkout(workout: Workout): Promise<Workout> {
    this.workoutHistory.push(workout)
    await this.saveHistory()
    return workout
  }

  public async updateWorkout(
    id: string,
    updatedWorkout: Partial<Workout>
  ): Promise<Workout | undefined> {
    const workoutIndex = this.workoutHistory.findIndex(
      (workout) => workout.id === id
    )
    if (workoutIndex === -1) {
      return undefined
    }

    const updatedWorkoutWithId = { ...this.workoutHistory[workoutIndex], ...updatedWorkout }
    this.workoutHistory[workoutIndex] = updatedWorkoutWithId
    await this.saveHistory()
    return updatedWorkoutWithId
  }

  public async deleteWorkout(id: string): Promise<boolean> {
    const initialLength = this.workoutHistory.length
    this.workoutHistory = this.workoutHistory.filter(
      (workout) => workout.id !== id
    )
    if (this.workoutHistory.length < initialLength) {
      await this.saveHistory()
      return true
    }
    return false
  }
}
