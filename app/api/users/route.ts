// app/api/users/route.ts
import { CreateUserProfileSchema } from '@/lib/validation/schemas'
import { UserProfile } from '@/types/data-models'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import logger from '@/utils/logger.js'

/**
 * Handles the POST request to create a new user.
 *
 * @param {NextRequest} req - The incoming request.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const validatedData = CreateUserProfileSchema.parse(body)

    // In a real application, you would save the user to a database.
    // For this example, we'll just return the created user.
    const newUser: UserProfile = {
      id: uuidv4(),
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          errors: error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }
    // Handle cases where req.json() fails (e.g., empty body)
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid JSON in request body.' },
        { status: 400 }
      )
    }
    logger.error('Unhandled error in POST /api/users:', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
