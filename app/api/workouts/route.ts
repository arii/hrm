// app/api/workouts/route.ts
import { NextResponse } from 'next/server'
import { serviceContainer } from '../../../lib/serviceContainer'
import { WorkoutHistoryService } from '../../../services/workoutHistoryService'
import { workoutSchema } from '../../../types/workout'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

const getService = (): WorkoutHistoryService => {
  const service = serviceContainer.get('workoutHistoryService')
  if (!service) {
    // This indicates a critical application setup error.
    // In a production environment, this should ideally be caught during application startup.
    throw new Error(
      'WorkoutHistoryService is not registered in the service container.'
    )
  }
  return service
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const service = getService()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const workout = await service.getWorkoutById(id)
    if (workout) {
      return NextResponse.json(workout)
    }
    return NextResponse.json({ message: 'Workout not found' }, { status: 404 })
  }

  const history = await service.getHistory()
  return NextResponse.json(history)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const service = getService()
  try {
    const body = await request.json()
    const newWorkoutData = workoutSchema.parse(body)
    const newWorkout = await service.addWorkout(newWorkoutData)
    return NextResponse.json(newWorkout, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid workout data', errors: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: 'Failed to create workout' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const service = getService()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { message: 'Workout ID is required' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const updatedWorkoutData = workoutSchema.partial().parse(body)
    const updatedWorkout = await service.updateWorkout(id, updatedWorkoutData)

    if (updatedWorkout) {
      return NextResponse.json(updatedWorkout)
    }
    return NextResponse.json({ message: 'Workout not found' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid workout data', errors: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: 'Failed to update workout' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const service = getService()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { message: 'Workout ID is required' },
      { status: 400 }
    )
  }

  const success = await service.deleteWorkout(id)
  if (success) {
    return NextResponse.json({ message: 'Workout deleted successfully' })
  }
  return NextResponse.json({ message: 'Workout not found' }, { status: 404 })
}
