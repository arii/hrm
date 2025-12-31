// app/api/workouts/route.ts
import { NextResponse } from 'next/server'
import { getWorkouts } from '../../../services/workoutService'

export async function GET() {
  try {
    const workouts = await getWorkouts()
    return NextResponse.json(workouts)
  } catch (error) {
    console.error('Failed to retrieve workouts:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve workouts' },
      { status: 500 }
    )
  }
}
