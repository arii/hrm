// lib/middleware/errorHandler.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '../errors'

export const withErrorHandler = (
  handler: (req: NextRequest) => Promise<NextResponse>
) => {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        )
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
