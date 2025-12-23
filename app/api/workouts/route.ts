import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { CreateWorkoutSessionSchema } from '@/lib/validation/schemas'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  const body = await request.json()
  const validation = CreateWorkoutSessionSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(validation.error.errors, { status: 400 })
  }

  const { userId, startedAt, notes } = validation.data
  const workoutSession = await prisma.workoutSession.create({
    data: {
      userId,
      startedAt,
      notes,
    },
  })
  return NextResponse.json(workoutSession)
}

export async function GET() {
  const workoutSessions = await prisma.workoutSession.findMany()
  return NextResponse.json(workoutSessions)
}
