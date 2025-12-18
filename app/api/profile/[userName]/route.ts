// File: app/api/profile/[userName]/route.ts
/**
 * API Route for User Profiles
 *
 * This route handles fetching and updating user profiles.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getProfile, updateProfile } from '../../../../services/userProfileService'
import { z } from 'zod'

const UserProfileSchema = z.object({
  age: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  assignedGenderAtBirth: z
    .union([z.literal('male'), z.literal('female'), z.literal('other')])
    .optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { userName: string } }
) {
  try {
    const profile = await getProfile(params.userName)
    if (profile) {
      return NextResponse.json(profile)
    }
    return new NextResponse('Profile not found', { status: 404 })
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { userName: string } }
) {
  try {
    const body = await req.json()
    const validation = UserProfileSchema.safeParse(body)
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.issues), {
        status: 400,
      })
    }
    const updatedProfile = await updateProfile(params.userName, validation.data)
    return NextResponse.json(updatedProfile)
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
