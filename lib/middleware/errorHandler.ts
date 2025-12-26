// lib/middleware/errorHandler.ts
import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

/**
 * Defines the context object passed to Next.js API route handlers.
 * @template T - The shape of the route parameters.
 */
type RouteContext<T = Record<string, string | string[]>> = {
  params: T
}

/**
 * Defines the signature for an API route handler.
 * @template T - The shape of the route parameters.
 */
export type ApiHandler<T = Record<string, unknown>> = (
  req: Request,
  context: RouteContext<T>
) => Promise<NextResponse | Response> | NextResponse | Response

/**
 * Wraps an API route handler to provide centralized error handling.
 *
 * This function catches any errors that occur during the execution of the handler,
 * logs them, and returns a standardized JSON error response.
 *
 * @template T - The shape of the route parameters.
 * @param handler The API route handler to wrap.
 * @returns A new handler with error handling.
 */
export function withErrorHandler<T>(handler: ApiHandler<T>): ApiHandler<T> {
  return async (req: Request, context: RouteContext<T>) => {
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
