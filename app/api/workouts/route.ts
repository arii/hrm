// app/api/workouts/route.ts
import { NextResponse } from 'next/server'
import { WorkoutSessionRepository } from '../../../lib/repositories/WorkoutSessionRepository'

export async function GET() {
  try {
    const workoutRepository = new WorkoutSessionRepository()
    const sessions = await workoutRepository.findAll()
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Failed to retrieve workout sessions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
