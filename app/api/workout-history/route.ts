// app/api/workout-history/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { WorkoutHistory } from '@/types'

const historyFilePath = path.join(process.cwd(), 'logs', 'workout-history.json')

async function getHistory(): Promise<WorkoutHistory> {
  try {
    const data = await fs.readFile(historyFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (_error) {
    return []
  }
}

async function saveHistory(history: WorkoutHistory) {
  await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2))
}

export async function GET() {
  const history = await getHistory()
  return NextResponse.json(history)
}

export async function POST() {
  const summary = heartRateService.getWorkoutSummary()
  if (!summary) {
    return NextResponse.json(
      { error: 'No workout summary available' },
      { status: 400 }
    )
  }

  const history = await getHistory()
  history.unshift(summary)
  await saveHistory(history)

  heartRateService.reset()

  return NextResponse.json(summary)
}
