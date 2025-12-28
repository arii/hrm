import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withCsrfProtection } from '@/lib/middleware/csrf'
import { withValidation } from '@/lib/middleware/validation'
import prisma from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { userCreateSchema } from '@/lib/validation/schemas'

async function handler(
  req: NextRequest & { parsedBody: z.infer<typeof userCreateSchema> }
) {
  const userData = req.parsedBody
  const userId = nanoid()

  const newUser = await prisma.user.create({
    data: {
      id: userId,
      ...userData,
    },
  })

  return NextResponse.json(newUser, { status: 201 })
}

export const POST = withCsrfProtection(withValidation(userCreateSchema, handler))
