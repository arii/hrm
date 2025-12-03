// File: lib/middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

/**
 * @description A higher-order function to validate request bodies against a Zod schema.
 * @param schema The Zod schema to validate against.
 * @param handler The route handler to execute if validation is successful.
 * @returns A new route handler that performs validation before executing the original handler.
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json()
      const parsedData = schema.parse(body)
      return handler(req, parsedData)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            issues: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }

      // Handle cases where the body is not valid JSON
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        )
      }

      console.error('An unexpected error occurred in withValidation:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
