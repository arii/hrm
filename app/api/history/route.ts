import { NextResponse } from 'next/server'
import workoutRepository from '@/services/WorkoutRepository'

export const dynamic = 'force-dynamic' // Ensure we always check for file updates

export async function GET() {
  const sessions = await workoutRepository.getAllSessions()
  return NextResponse.json(sessions)
}
