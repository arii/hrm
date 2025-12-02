import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Handler type for endpoints that expect a validated request body
type NextApiHandlerWithBody<T> = (
  req: NextRequest,
  context: { body: T }
) => Promise<NextResponse>

// Handler type for endpoints that expect validated query parameters
type NextApiHandlerWithQuery<T> = (
  req: NextRequest,
  context: { query: T }
) => Promise<NextResponse>

/**
 * A higher-order function to validate the request body of a Next.js API route handler.
 * It parses and validates the JSON body of the request.
 *
 * @param schema The Zod schema to validate the request body against.
 * @param handler The API route handler to execute if validation is successful.
 * @returns A new API route handler with request body validation.
 */
export const withBodyValidation = <T>(
  schema: z.ZodSchema<T>,
  handler: NextApiHandlerWithBody<T>
) => {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const parsedBody = await schema.parseAsync(body)
      return handler(req, { body: parsedBody })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request body', details: error.issues },
          { status: 400 }
        )
      }
      // Handle cases where the request body is not valid JSON
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        )
      }
      console.error('Unhandled error in body validation middleware:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}

/**
 * A higher-order function to validate the query parameters of a Next.js API route handler.
 * It parses and validates the URL query parameters.
 *
 * @param schema The Zod schema to validate the query parameters against.
 * @param handler The API route handler to execute if validation is successful.
 * @returns A new API route handler with query parameter validation.
 */
export const withQueryValidation = <T>(
  schema: z.ZodSchema<T>,
  handler: NextApiHandlerWithQuery<T>
) => {
  return async (req: NextRequest) => {
    try {
      const query = Object.fromEntries(req.nextUrl.searchParams.entries())
      const parsedQuery = await schema.parseAsync(query)
      return handler(req, { query: parsedQuery })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.issues },
          { status: 400 }
        )
      }
      console.error('Unhandled error in query validation middleware:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
