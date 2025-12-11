// lib/middleware/errorHandlerDynamic.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

// For dynamic routes like /api/foo/[bar]
type DynamicApiHandler<T> = (
  req: NextRequest,
  context: { params: T }
) => Promise<NextResponse>

export function withErrorHandlerDynamic<T>(
  handler: DynamicApiHandler<T>
): DynamicApiHandler<T> {
  return async (req: NextRequest, context: { params: T }) => {
    try {
      return await handler(req, context)
    } catch (error) {
      if (error instanceof ApiError) {
        logger.warn({ err: error }, `API Error: ${error.message}`)
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        )
      }

      const message =
        error instanceof Error ? error.message : 'An unknown error occurred.'
      logger.error({ err: error }, `Internal Server Error: ${message}`)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
