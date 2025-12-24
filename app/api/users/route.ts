// app/api/users/route.ts
import { CreateUserProfileSchema } from '@/lib/validation/schemas'
import { UserProfile } from '@/types/core'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

/**
 * Handles the POST request to create a new user.
 *
 * @param {NextRequest} req - The incoming request.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const validationResult = CreateUserProfileSchema.safeParse(body)

    if (!validationResult.success) {
      // The test expects an array of errors, let's use the `issues` property
      return NextResponse.json(
        {
          message: 'Invalid request body',
          errors: validationResult.error.issues, // This provides an array
        },
        { status: 400 }
      )
    }

    // In a real application, you would save the user to a database.
    const newUser: UserProfile = {
      id: uuidv4(),
      ...validationResult.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    // Handle cases where req.json() fails (e.g., invalid JSON)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON format' }, { status: 400 })
    }
    // Generic server error
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
