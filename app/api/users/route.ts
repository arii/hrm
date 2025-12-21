/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware/validation'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { CreateUserProfileSchema } from '@/lib/validation/schemas'

type CreateUserProfile = z.infer<typeof CreateUserProfileSchema>

async function createUser(
  _: NextRequest,
  { body }: { body: CreateUserProfile }
) {
  const newUser = {
    id: uuidv4(),
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return NextResponse.json(newUser, { status: 201 })
}

export const POST = withValidation({ body: CreateUserProfileSchema })(
  createUser
)
