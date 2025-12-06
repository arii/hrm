import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import * as Prisma from '@prisma/client'
import { spotifyServiceInstance } from '@/utils/socketManager'

const prisma = new Prisma.PrismaClient()

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It persists the latest token payload to the database.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = await req.json()
    const {
      sub: spotifyUserId,
      access_token,
      refresh_token,
      expires_in,
    } = payload

    if (!spotifyUserId) {
      throw new ApiError(400, 'Missing spotifyUserId (sub) in token payload')
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000)

    await prisma.spotifyToken.upsert({
      where: { spotifyUserId },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiresAt: expiresAt,
      },
      create: {
        spotifyUserId,
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiresAt: expiresAt,
      },
    })

    logger.info(
      { subject: spotifyUserId },
      'Received and persisted token-delivery'
    )

    // Notify the polling service
    if (spotifyServiceInstance) {
      spotifyServiceInstance.setRefreshToken(spotifyUserId)
    }

    return NextResponse.json({ ok: true })
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
