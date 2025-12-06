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

export async function GET() {
  const history = await getHistory()
  return NextResponse.json(history)
}
