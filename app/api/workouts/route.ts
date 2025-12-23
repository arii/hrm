import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { userId, startedAt, notes } = body
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
