import { ApiError } from '@/lib/errors'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import logger from '@/utils/logger'
import { withBodyValidation } from '@/lib/middleware/validation'
import { tokenDeliverySchema } from '@/lib/validation/schemas'
import { z } from 'zod'

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const OUT_FILE = path.join(LOG_DIR, 'spotify_tokens.json')

type TokenDeliveryBody = z.infer<typeof tokenDeliverySchema> & {
  sub?: string
  provider?: string
}

const handler = async (
  req: NextRequest,
  { body }: { body: TokenDeliveryBody }
) => {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

    const record = {
      receivedAt: Date.now(),
      payload: body,
    }
    fs.writeFileSync(OUT_FILE, JSON.stringify(record, null, 2), 'utf8')

    logger.info(
      { subject: body.sub ?? body.provider },
      'Received token-delivery'
    )
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

export const POST = withBodyValidation(tokenDeliverySchema, handler)
