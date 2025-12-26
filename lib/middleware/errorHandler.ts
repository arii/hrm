// lib/middleware/errorHandler.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

// This type is compatible with the Next.js App Router route handlers.
// The second argument is a context object containing params, etc.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandler = (req: NextRequest, context: any) => Promise<NextResponse>

/**
 * Wraps an API route handler to provide centralized error handling.
 *
 * This function catches any errors that occur during the execution of the handler,
 * logs them, and returns a standardized JSON error response.
 *
 * @param handler The API route handler to wrap.
 * @returns A new handler with error handling.
 */
export function withErrorHandler(handler: ApiHandler) {
  return async (req: NextRequest, context: unknown) => {
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
