import { ApiError } from '@/lib/errors'
import * as fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import * as path from 'path'
import logger from '@/utils/logger'
import { withBodyValidation } from '@/lib/middleware/validation'
import { clearTokenSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

const handler = async (
  req: NextRequest,
  { body }: { body: z.infer<typeof clearTokenSchema> }
) => {
  try {
    const tokenFilePath = path.join(
      process.cwd(),
      'logs',
      'spotify_tokens.json'
    )

    // The 'token' from the body is validated but not used in the logic.
    // This endpoint simply clears the token file if it exists.
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath)
      logger.info('[API /clear-token] Deleted spotify_tokens.json')
      return NextResponse.json({
        success: true,
        message: 'Token file cleared',
      })
    } else {
      logger.info('[API /clear-token] Token file does not exist')
      return NextResponse.json({
        success: true,
        message: 'Token file already cleared',
      })
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error('[API /clear-token] Error clearing token file:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear token file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const POST = withBodyValidation(clearTokenSchema, handler)
