import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: context.params.id },
  })
  if (!workoutSession) {
    return NextResponse.json({ error: 'Workout session not found' }, { status: 404 })
  }
  return NextResponse.json(workoutSession)
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const body = await request.json()
  const { endedAt, notes } = body
  const workoutSession = await prisma.workoutSession.update({
    where: { id: context.params.id },
    data: {
      endedAt,
      notes,
    },
  })
  return NextResponse.json(workoutSession)
}
