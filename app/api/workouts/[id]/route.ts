import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { UpdateWorkoutSessionSchema } from '@/lib/validation/schemas'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id },
  })
  if (!workoutSession) {
    return NextResponse.json({ error: 'Workout session not found' }, { status: 404 })
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
    return NextResponse.json(validation.error.errors, { status: 400 })
  }

  const { endedAt, notes } = validation.data
  const workoutSession = await prisma.workoutSession.update({
    where: { id },
    data: {
      endedAt,
      notes,
    },
  })
  return NextResponse.json(workoutSession)
}
