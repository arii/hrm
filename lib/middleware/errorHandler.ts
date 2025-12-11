// lib/middleware/errorHandler.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

// Base handler types
type SimpleApiHandler = (req: NextRequest) => Promise<NextResponse>
type DynamicApiHandler<T> = (
  req: NextRequest,
  context: { params: T }
) => Promise<NextResponse>

// Type guard to check if params is a Promise
function isPromise<T>(p: unknown): p is Promise<T> {
  return p instanceof Promise
}

// Overload signatures
export function withErrorHandler<T>(
  handler: DynamicApiHandler<T>
): (
  req: NextRequest,
  context: { params: T | Promise<T> }
) => Promise<NextResponse>
export function withErrorHandler(handler: SimpleApiHandler): SimpleApiHandler

// Implementation
export function withErrorHandler<T>(
  handler: (req: NextRequest, context: { params: T }) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params?: T | Promise<T> }) => {
    try {
      // Resolve params if it's a promise
      if (context && context.params && isPromise(context.params)) {
        const resolvedParams = await context.params
        return await handler(req, { ...context, params: resolvedParams })
      }
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
