/**
 * @file This file contains the withValidation middleware for App Router API routes.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { fromZodError } from 'zod-validation-error'

type AppRouterHandler<TBody, TQuery, TParams, THeaders> = (
  req: NextRequest,
  context: {
    params: TParams
    body: TBody
    query: TQuery
    headers: THeaders
  }
) => Promise<NextResponse>

interface ValidationSchemas<TBody, TQuery, TParams, THeaders> {
  body?: z.ZodType<TBody>
  query?: z.ZodType<TQuery>
  params?: z.ZodType<TParams>
  headers?: z.ZodType<THeaders>
}

export function withValidation<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  THeaders = unknown,
>({
  body: bodySchema,
  query: querySchema,
  params: paramsSchema,
  headers: headersSchema,
}: ValidationSchemas<TBody, TQuery, TParams, THeaders>) {
  return (handler: AppRouterHandler<TBody, TQuery, TParams, THeaders>) =>
    async (req: NextRequest, context: { params: TParams }) => {
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

        const query = Object.fromEntries(req.nextUrl.searchParams)
        const params = context.params
        const headers = Object.fromEntries(req.headers)

        const finalSchema = z.object({
          ...(bodySchema && { body: bodySchema }),
          ...(querySchema && { query: querySchema }),
          ...(paramsSchema && { params: paramsSchema }),
          ...(headersSchema && { headers: headersSchema }),
        })

        const result = finalSchema.safeParse({ body, query, params, headers })

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
          body: result.data.body,
          query: result.data.query,
          params: result.data.params,
          headers: result.data.headers,
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
