import { ApiError } from '@/lib/errors'
import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'

let prisma: PrismaClient

export async function POST(req: NextRequest) {
  if (!prisma) {
    prisma = new PrismaClient()
  }

  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = await req.json()

    // Validate payload structure
    if (
      !payload.sub ||
      !payload.access_token ||
      !payload.refresh_token ||
      !payload.expires_in
    ) {
      throw new ApiError(400, 'Invalid token payload')
    }

    const spotifyUserId = payload.sub
    const accessToken = payload.access_token
    const refreshToken = payload.refresh_token
    const expiresIn = payload.expires_in
    const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    await prisma.spotifyToken.upsert({
      where: { spotifyUserId },
      update: {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        updatedAt: new Date(),
      },
      create: {
        spotifyUserId,
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
      },
    })

    logger.info(
      { subject: spotifyUserId },
      'Received and stored token-delivery'
    )
    return NextResponse.json({ ok: true, userId: spotifyUserId })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    logger.error('token-delivery error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
