// File: lib/middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

type NextHandler<T> = (
  req: NextRequest,
  data: T
) => Promise<NextResponse>

/**
 * A higher-order function to wrap Next.js API route handlers with Zod validation.
 *
 * @param schema - The Zod schema to validate the request data against.
 * @param handler - The original API route handler to execute on successful validation.
 * @param type - The type of data to validate ('body' or 'query'). Defaults to 'body'.
 * @returns A new route handler that performs validation before calling the original handler.
 */
export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: NextHandler<z.infer<T>>,
  type: 'body' | 'query' = 'body'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let data: unknown
      if (type === 'body') {
        data = await req.json()
      } else {
        const searchParams = req.nextUrl.searchParams
        data = Object.fromEntries(searchParams.entries())
      }

      const parsedData = schema.parse(data) as z.infer<T>
      return handler(req, parsedData)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            issues: error.errors,
          },
          { status: 400 }
        )
      }
      if (error instanceof SyntaxError && type === 'body') {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }
      // Log unexpected errors
      console.error('An unexpected error occurred in withValidation:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
