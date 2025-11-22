import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

type NextApiHandlerWithBody<T> = (
  req: NextRequest,
  body: T
) => Promise<NextResponse>

export const withValidation = <T>(
  schema: z.ZodSchema<T>,
  handler: NextApiHandlerWithBody<T>
) => {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const parsedBody = await schema.parseAsync(body)
      return handler(req, parsedBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request body', details: error.issues },
          { status: 400 }
        )
      }
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        )
      }
      console.error('Unhandled error in validation middleware:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
