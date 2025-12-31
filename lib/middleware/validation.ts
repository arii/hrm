/**
 * @file This file contains the withValidation middleware for App Router API routes.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Defines the type for an App Router API route handler after it has been
 * processed by the validation middleware. It receives the original request
 * and the validated data as arguments.
 *
 * @template T The expected type of the validated data.
 * @param {Request} req The original Next.js request object.
 * @param {{ params: P; body: T }} context An object containing URL parameters and the validated request body.
 * @returns {Promise<NextResponse>} A promise that resolves to a Next.js response.
 */
type AppRouterHandler<T, P> = (
  req: Request,
  context: { params: P; body: T }
) => Promise<NextResponse>

/**
 * A higher-order function that wraps an App Router API route handler to provide
 * automatic request body and params validation using Zod schemas.
 *
 * @template T The expected type of the validated data.
 * @template P The expected type of the URL parameters.
 * @param {{ schema: z.ZodType<T>; paramsSchema?: z.ZodType<P> }} options The validation schemas.
 * @returns A function that takes a handler and returns a new handler with validation logic.
 *
 * @example
 * import { withValidation } from '@/lib/middleware/validation';
 * import { CreateUserSchema } from '@/lib/validation/schemas';
 *
 * async function postHandler(req, { body }) {
 *   // 'body' is now guaranteed to match CreateUserSchema
 *   // ...
 * }
 *
 * export const POST = withValidation({ schema: CreateUserSchema })(postHandler);
 */
export function withValidation<T, P>({
  schema,
  paramsSchema,
}: {
  schema: z.ZodType<T>
  paramsSchema?: z.ZodType<P>
}) {
  return (handler: AppRouterHandler<T, P>) =>
    // The 'context.params' is typed as 'any' to accommodate the dynamic nature
    // of Next.js route parameters. The 'paramsSchema' is used to validate and
    // provide type safety to the handler.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (req: Request, context: { params: any }) => {
      try {
        let validatedParams = context.params
        if (paramsSchema) {
          validatedParams = paramsSchema.parse(context.params)
        }
        if (req.body === null) {
          return NextResponse.json(
            { message: 'Request body cannot be empty.' },
            { status: 400 }
          )
        }
        const body = await req.json()
        const validatedData = schema.parse(body)
        return handler(req, {
          ...context,
          params: validatedParams,
          body: validatedData,
        })
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
        // Handle cases where req.json() fails (e.g., empty body)
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
