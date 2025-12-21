/**
 * @file This file contains the withValidation middleware for App Router API routes.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { fromZodError } from 'zod-validation-error'
import { ZodError } from 'zod'

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
        // Only parse body if a schema is provided and the request has a body
        if (bodySchema && req.body) {
          const contentType = req.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const bodyText = await req.text()
            // Zod will handle empty body validation, so we parse even if bodyText is empty
            body = bodyText.length > 0 ? JSON.parse(bodyText) : undefined
          }
        }

        const query = Object.fromEntries(req.nextUrl.searchParams)
        const params = context.params
        const headers = Object.fromEntries(req.headers)

        const validationIssues: z.ZodIssue[] = []
        let validatedBody: TBody = body as TBody
        let validatedQuery: TQuery = query as TQuery
        let validatedParams: TParams = params as TParams
        let validatedHeaders: THeaders = headers as THeaders

        if (bodySchema) {
          const result = bodySchema.safeParse(body)
          if (!result.success) {
            validationIssues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: ['body', ...issue.path],
              }))
            )
          } else {
            validatedBody = result.data
          }
        }

        if (querySchema) {
          const result = querySchema.safeParse(query)
          if (!result.success) {
            validationIssues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: ['query', ...issue.path],
              }))
            )
          } else {
            validatedQuery = result.data
          }
        }

        if (paramsSchema) {
          const result = paramsSchema.safeParse(params)
          if (!result.success) {
            validationIssues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: ['params', ...issue.path],
              }))
            )
          } else {
            validatedParams = result.data
          }
        }

        if (headersSchema) {
          const result = headersSchema.safeParse(headers)
          if (!result.success) {
            validationIssues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: ['headers', ...issue.path],
              }))
            )
          } else {
            validatedHeaders = result.data
          }
        }

        if (validationIssues.length > 0) {
          const validationError = fromZodError(new ZodError(validationIssues))
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationError.details,
            },
            { status: 400 }
          )
        }

        return handler(req, {
          body: validatedBody as TBody,
          query: validatedQuery as TQuery,
          params: validatedParams as TParams,
          headers: validatedHeaders as THeaders,
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
