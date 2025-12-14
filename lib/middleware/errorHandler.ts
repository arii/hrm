// lib/middleware/errorHandler.ts
import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors.js'
import logger from '@/utils/logger.js'

type ApiHandler = (req: Request, ...args: unknown[]) => Promise<NextResponse>

/**
 * Wraps an API route handler to provide centralized error handling.
 *
 * This function catches any errors that occur during the execution of the handler,
 * logs them, and returns a standardized JSON error response.
 *
 * @param handler The API route handler to wrap.
 * @returns A new handler with error handling.
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: Request, ...args: unknown[]) => {
    try {
      return await handler(req, ...args)
    } catch (error: any) {
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
