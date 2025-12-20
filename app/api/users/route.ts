/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware/validation'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

export const CreateUserProfileSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long.' })
    .max(20, { message: 'Username must be no longer than 20 characters.' }),
  email: z.string().email({ message: 'Invalid email address' }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

type CreateUserProfile = z.infer<typeof CreateUserProfileSchema>

async function createUser(
  req: NextRequest,
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
