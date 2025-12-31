// services/workoutService.ts
import { promises as fs } from 'fs'
import path from 'path'
import { Workout } from '../types'

const workoutsFilePath = path.join(process.cwd(), 'logs', 'workouts.json')

async function readWorkouts(): Promise<Workout[]> {
  try {
    const data = await fs.readFile(workoutsFilePath, 'utf-8')
    return JSON.parse(data) as Workout[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [] // File doesn't exist, return empty array
    }
    throw error
  }
}

async function writeWorkouts(workouts: Workout[]): Promise<void> {
  await fs.writeFile(workoutsFilePath, JSON.stringify(workouts, null, 2))
}

export async function saveWorkout(workout: Workout): Promise<void> {
  const workouts = await readWorkouts()
  workouts.push(workout)
  await writeWorkouts(workouts)
}

export async function getWorkouts(): Promise<Workout[]> {
  return readWorkouts()
}
