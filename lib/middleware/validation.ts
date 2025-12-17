/**
 * @file This file contains the withValidation middleware for App Router API routes.
 * It provides a higher-order function to wrap API route handlers for automatic
 * request body and query parameter validation using Zod schemas.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

/**
 * Defines the schemas for validating different parts of an API request.
 * @template TBody The Zod type for the request body.
 * @template TQuery The Zod type for the request query parameters.
 */
interface ValidationSchemas<TBody, TQuery> {
  bodySchema?: z.ZodType<TBody>
  querySchema?: z.ZodType<TQuery>
}

/**
 * Defines the context object passed to the API route handler after validation.
 * @template TBody The inferred type of the validated request body.
 * @template TQuery The inferred type of the validated request query parameters.
 * @template TParams The type of the URL parameters.
 */
interface ValidatedContext<TBody, TQuery, TParams> {
  params: TParams
  body: TBody
  query: TQuery
}

/**
 * Defines the type for an App Router API route handler that uses the validation middleware.
 * @template TBody The inferred type of the validated request body.
 * @template TQuery The inferred type of the validated request query parameters.
 * @template TParams The type of the URL parameters.
 */
type AppRouterHandler<TBody, TQuery, TParams> = (
  req: Request,
  context: ValidatedContext<TBody, TQuery, TParams>
) => Promise<NextResponse>

/**
 * A higher-order function that wraps an App Router API route handler to provide
 * automatic request body and query parameter validation using Zod schemas.
 *
 * This middleware simplifies input validation by parsing and validating the request
 * before the handler logic is executed. If validation fails, it automatically
 * returns a 400 Bad Request response with detailed error messages.
 *
 * @template TBody The Zod type for the request body.
 * @template TQuery The Zod type for the request query parameters.
 * @template TParams The type of the URL parameters.
 * @param {ValidationSchemas<TBody, TQuery>} schemas An object containing Zod schemas for the body and/or query.
 * @returns A function that takes a handler and returns a new handler with validation logic.
 *
 * @example
 * // Validate request body
 * export const POST = withValidation({ bodySchema: CreateUserSchema })(postHandler);
 *
 * // Validate query parameters
 * export const GET = withValidation({ querySchema: GetUsersSchema })(getHandler);
 *
 * // Validate both body and query
 * export const PUT = withValidation({
 *   bodySchema: UpdateUserSchema,
 *   querySchema: GetUserByIdSchema
 * })(updateHandler);
 */
export function withValidation<TBody, TQuery, TParams>({
  bodySchema,
  querySchema,
}: ValidationSchemas<TBody, TQuery>) {
  return (handler: AppRouterHandler<TBody, TQuery, TParams>) =>
    async (req: Request, context: { params: TParams }) => {
      try {
        let body: TBody = undefined as TBody
        if (bodySchema) {
          try {
            const json = await req.json()
            body = bodySchema.parse(json)
          } catch (error) {
            if (error instanceof SyntaxError) {
              return NextResponse.json(
                { message: 'Invalid JSON in request body.' },
                { status: 400 }
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

        return handler(req, { ...context, body, query })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              errors: error.issues.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
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
