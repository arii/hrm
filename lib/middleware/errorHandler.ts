// lib/middleware/errorHandler.ts
import { NextResponse, NextRequest } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

// This handler type now supports both static routes (context is undefined)
// and dynamic routes (context is provided).
type ApiHandler<T = unknown> = (
  req: NextRequest,
  context?: { params: T }
) => Promise<NextResponse>

/**
 * Wraps an API route handler with centralized error handling.
 * This catches instances of `ApiError` and returns a formatted JSON response,
 * while logging and returning a generic 500 error for all other exceptions.
 *
 * It is designed to work with both static and dynamic Next.js App Router routes.
 *
 * @template T The expected type of the `params` object for dynamic routes.
 * @param {ApiHandler<T>} handler The API route handler to wrap.
 * @returns A new handler function with error handling.
 */
export function withErrorHandler<T = unknown>(
  handler: ApiHandler<T>
): (req: NextRequest, context?: { params: T }) => Promise<NextResponse> {
  return async (req: NextRequest, context?: { params: T }) => {
    try {
      // The handler can be called with context; static handlers will simply ignore it.
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
