// lib/middleware/errorHandler.ts
import { NextResponse, NextRequest } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'
import { RouteContext } from '@/lib/types'

type ApiHandler<T> = (
  req: NextRequest,
  context: RouteContext<T>
) => Promise<NextResponse>

/**
 * Wraps an API route handler with centralized error handling.
 * This catches instances of `ApiError` and returns a formatted JSON response,
 * while logging and returning a generic 500 error for all other exceptions.
 *
 * It is designed to work with Next.js App Router dynamic routes.
 *
 * @template T The expected type of the `params` object for dynamic routes.
 * @param {ApiHandler<T>} handler The API route handler to wrap.
 * @returns A new handler function with error handling.
 */
export function withErrorHandler<T>(
  handler: ApiHandler<T>
): (req: NextRequest, context: RouteContext<T>) => Promise<NextResponse> {
  return async (req: NextRequest, context: RouteContext<T>) => {
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
