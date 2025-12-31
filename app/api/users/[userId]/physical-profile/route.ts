// app/api/users/[userId]/physical-profile/route.ts
import { withValidation } from '@/lib/middleware/validation'
import { UserPhysicalProfileSchema } from '@/lib/validation/schemas'
import { UserPhysicalProfile } from '@/types/core'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  userId: z.string().uuid(),
})

/**
 * Handles the POST request to create a new user physical profile.
 *
 * @param {Request} req - The incoming request.
 * @param {object} context - The context object, containing the validated body and params.
 * @param {Omit<UserPhysicalProfile, 'userId'>} context.body - The validated user physical profile data.
 * @param {{ userId: string }} context.params - The route parameters.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
async function createUserPhysicalProfile(
  _req: Request,
  {
    body,
    params,
  }: {
    body: Omit<UserPhysicalProfile, 'userId'>
    params: z.infer<typeof paramsSchema>
  }
): Promise<NextResponse> {
  // In a real application, you would save the user physical profile to a database,
  // associating it with the userId.
  const newUserPhysicalProfile: UserPhysicalProfile = {
    userId: params.userId,
    ...body,
  }

  return NextResponse.json(newUserPhysicalProfile, { status: 201 })
}

export const POST = withValidation({
  schema: UserPhysicalProfileSchema.omit({ userId: true }),
  paramsSchema,
})(createUserPhysicalProfile)
