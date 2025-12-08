// File: app/api/workouts/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { WorkoutStats } from '@/services/HeartRateService'

const historyFilePath = path.join(process.cwd(), 'logs', 'workout-history.json')

async function readHistory(): Promise<WorkoutStats[]> {
  try {
    await fs.access(historyFilePath)
    const data = await fs.readFile(historyFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (_error) {
    return [] // Return empty array if file doesn't exist or is invalid
  }
}

async function writeHistory(history: WorkoutStats[]): Promise<void> {
  await fs.mkdir(path.dirname(historyFilePath), { recursive: true })
  await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2))
}

export async function GET() {
  const history = await readHistory()
  return NextResponse.json(history)
}

export async function POST(request: Request) {
  const newWorkout: WorkoutStats = await request.json()
  const history = await readHistory()
  history.unshift(newWorkout) // Add to the beginning of the list
  await writeHistory(history.slice(0, 20)) // Keep only the last 20 workouts
  return NextResponse.json({ success: true, workout: newWorkout })
}
