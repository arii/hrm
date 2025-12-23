import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UpdateWorkoutSessionSchema } from '@/lib/validation/schemas'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id },
  })
  if (!workoutSession) {
    return NextResponse.json(
      { error: 'Workout session not found' },
      { status: 404 }
    )
  }
  return NextResponse.json(workoutSession)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const body = await request.json()
  const validation = UpdateWorkoutSessionSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(validation.error.issues, { status: 400 })
  }

  const dataToUpdate = Object.fromEntries(
    Object.entries(validation.data).filter(([, value]) => value !== undefined)
  )

  const workoutSession = await prisma.workoutSession.update({
    where: { id },
    data: dataToUpdate,
  })
  return NextResponse.json(workoutSession)
}
