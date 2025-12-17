/**
 * @file This file contains the withValidation middleware for App Router API routes.
 * It provides a higher-order function to wrap API route handlers for automatic
 * request body, query parameter, headers, and URL parameter validation using Zod schemas.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Defines the schemas for validating different parts of an API request.
 * @template TBody The Zod type for the request body.
 * @template TQuery The Zod type for the request query parameters.
 * @template TParams The Zod type for the URL parameters.
 * @template THeaders The Zod type for the request headers.
 */
interface ValidationSchemas<TBody, TQuery, TParams, THeaders> {
  bodySchema?: z.ZodType<TBody>
  querySchema?: z.ZodType<TQuery>
  paramsSchema?: z.ZodType<TParams>
  headersSchema?: z.ZodType<THeaders>
}

/**
 * Defines the context object passed to the API route handler after validation.
 * @template TBody The inferred type of the validated request body.
 * @template TQuery The inferred type of the validated request query parameters.
 * @template TParams The inferred type of the validated URL parameters.
 * @template THeaders The inferred type of the validated request headers.
 */
interface ValidatedContext<TBody, TQuery, TParams, THeaders> {
  params: TParams
  body: TBody
  query: TQuery
  headers: THeaders
}

/**
 * Defines the type for an App Router API route handler that uses the validation middleware.
 * @template TBody The inferred type of the validated request body.
 * @template TQuery The inferred type of the validated request query parameters.
 * @template TParams The inferred type of the validated URL parameters.
 * @template THeaders The inferred type of the validated request headers.
 */
type AppRouterHandler<TBody, TQuery, TParams, THeaders> = (
  req: Request,
  context: ValidatedContext<TBody, TQuery, TParams, THeaders>
) => Promise<NextResponse>

/**
 * Creates a standardized error response.
 * @param {string} message - The error message.
 * @param {number} status - The HTTP status code.
 * @param {string} type - The type of error.
 * @param {Array<object>} [issues] - An optional array of detailed error issues.
 * @returns {NextResponse} A Next.js response object.
 */
const createErrorResponse = (
  message: string,
  status: number,
  type: string,
  issues?: Array<object>
) => {
  return NextResponse.json(
    {
      message,
      type,
      ...(issues && { issues }),
    },
    { status }
  )
}

/**
 * A higher-order function that wraps an App Router API route handler to provide
 * automatic request body, query parameter, headers, and URL parameter validation using Zod schemas.
 *
 * This middleware simplifies input validation by parsing and validating the request
 * before the handler logic is executed. If validation fails, it automatically
 * returns a 400 Bad Request response with detailed error messages.
 *
 * @template TBody The Zod type for the request body.
 * @template TQuery The Zod type for the request query parameters.
 * @template TParams The Zod type for the URL parameters.
 * @template THeaders The Zod type for the request headers.
 * @param {ValidationSchemas<TBody, TQuery, TParams, THeaders>} schemas An object containing Zod schemas for the body, query, params, and/or headers.
 * @returns A function that takes a handler and returns a new handler with validation logic.
 */
export function withValidation<TBody, TQuery, TParams, THeaders>({
  bodySchema,
  querySchema,
  paramsSchema,
  headersSchema,
}: ValidationSchemas<TBody, TQuery, TParams, THeaders>) {
  return (handler: AppRouterHandler<TBody, TQuery, TParams, THeaders>) =>
    async (req: Request, context: { params: TParams }) => {
      try {
        let body: TBody = undefined as TBody
        if (bodySchema) {
          try {
            const json = await req.json()
            body = bodySchema.parse(json)
          } catch (error) {
            if (error instanceof SyntaxError) {
              return createErrorResponse(
                'Invalid JSON in request body.',
                400,
                'SyntaxError'
              )
            }
            // Re-throw ZodError to be caught by the outer try-catch
            throw error
          }
        }

        let query: TQuery = undefined as TQuery
        if (querySchema) {
          const { searchParams } = new URL(req.url)
          const queryParams = Object.fromEntries(searchParams)
          query = querySchema.parse(queryParams)
        }

        let params: TParams = undefined as TParams
        if (paramsSchema) {
          params = paramsSchema.parse(context.params)
        }

        let headers: THeaders = undefined as THeaders
        if (headersSchema) {
          const headersObject = Object.fromEntries(
            (req.headers as any).entries()
          )
          headers = headersSchema.parse(headersObject)
        }

        return handler(req, { ...context, body, query, params, headers })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return createErrorResponse(
            'Validation failed.',
            400,
            'ZodError',
            error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          )
        }

        console.error('Unhandled error in withValidation:', error)
        return createErrorResponse(
          'An internal server error occurred.',
          500,
          'InternalServerError'
        )
      }
    }
}
