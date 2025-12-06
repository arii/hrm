import { workoutService } from '@/services/workoutService'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const history = await workoutService.getHistory()
    return NextResponse.json(history)
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const workout = await request.json()
    const newRecord = await workoutService.saveWorkout(workout)
    return NextResponse.json(newRecord, { status: 201 })
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
