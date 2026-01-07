
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { fromZodError } from 'zod-validation-error'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

type Handler = (req: NextRequest, ...args: any[]) => Promise<NextResponse>

export function withErrorHandler(handler: Handler) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      if (error instanceof ApiError) {
        logger.warn({ err: error }, `API Error: ${error.message}`)
        return NextResponse.json(
          { message: error.message },
          { status: error.statusCode }
        )
      }

      if (error instanceof ZodError) {
        const validationError = fromZodError(error)
        logger.warn(
          { err: validationError },
          `Validation Error: ${validationError.message}`
        )
        return NextResponse.json(
          { message: validationError.message },
          { status: 400 }
        )
      }

      logger.error({ err: error }, 'Unhandled API error')
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
