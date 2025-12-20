/**
 * @file This file contains the withValidation middleware for App Router API routes.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { fromZodError } from 'zod-validation-error'

type AppRouterHandler<TBody> = (
  req: NextRequest,
  context: {
    body: TBody
  }
) => Promise<NextResponse>

interface ValidationSchemas<TBody> {
  body?: z.ZodType<TBody>
}

export function withValidation<TBody = unknown>({
  body: bodySchema,
}: ValidationSchemas<TBody>) {
  return (handler: AppRouterHandler<TBody>) => async (req: NextRequest) => {
    try {
      let body: TBody | undefined
      if (req.body) {
        const contentType = req.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const bodyText = await req.text()
          if (bodyText.length) {
            body = JSON.parse(bodyText)
          }
        }
      }

      if (bodySchema) {
        const result = bodySchema.safeParse(body)
        if (!result.success) {
          const validationError = fromZodError(result.error)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationError.details,
            },
            { status: 400 }
          )
        }
        return handler(req, {
          body: result.data,
        })
      }

      return handler(req, {
        body: body as TBody,
      })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { message: 'Invalid JSON in request body.' },
          { status: 400 }
        )
      }
      console.error('Unhandled error in withValidation:', error)
      return NextResponse.json(
        { message: 'An internal server error occurred.' },
        { status: 500 }
      )
    }
  }
}
