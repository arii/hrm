/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware/validation'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { CreateUserProfileSchema } from '@/lib/validation/schemas'

type CreateUserProfile = z.infer<typeof CreateUserProfileSchema>

async function createUser(
  _: Request,
  { validatedData }: { validatedData: { body: CreateUserProfile } }
) {
  const newUser = {
    id: uuidv4(),
    ...validatedData.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return NextResponse.json(newUser, { status: 201 })
}

export const POST = withValidation({ bodySchema: CreateUserProfileSchema })(
  createUser
)
