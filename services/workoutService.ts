import { promises as fs } from 'fs'
import path from 'path'
import { WorkoutStats } from './HeartRateService'

const WORKOUT_HISTORY_FILE = path.join(process.cwd(), 'logs', 'workout-history.json')

export interface WorkoutRecord extends WorkoutStats {
  id: string
  date: string
}

class WorkoutService {
  private async readHistory(): Promise<WorkoutRecord[]> {
    try {
      await fs.access(WORKOUT_HISTORY_FILE)
      const data = await fs.readFile(WORKOUT_HISTORY_FILE, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // If the file doesn't exist, return an empty array
      return []
    }
  }

  private async writeHistory(history: WorkoutRecord[]): Promise<void> {
    const dir = path.dirname(WORKOUT_HISTORY_FILE)
    try {
      await fs.access(dir)
    } catch (error) {
      await fs.mkdir(dir, { recursive: true })
    }
    await fs.writeFile(WORKOUT_HISTORY_FILE, JSON.stringify(history, null, 2))
  }

  async getHistory(): Promise<WorkoutRecord[]> {
    const history = await this.readHistory()
    // Sort by date descending
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  async saveWorkout(workout: WorkoutStats): Promise<WorkoutRecord> {
    const history = await this.readHistory()
    const newRecord: WorkoutRecord = {
      ...workout,
      id: new Date().toISOString(),
      date: new Date().toISOString(),
    }
    history.push(newRecord)
    await this.writeHistory(history)
    return newRecord
  }
}

export const workoutService = new WorkoutService()
