import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * A generic handler type for requests that have been successfully validated.
 * @param req The original NextRequest object.
 * @param validatedData The Zod-parsed data, either from the request body or query parameters.
 */
type ValidatedRequestHandler<T> = (
  req: NextRequest,
  validatedData: T
) => Promise<NextResponse>

/**
 * A higher-order function to wrap Next.js API route handlers with Zod validation.
 * It automatically handles parsing and validation for both JSON request bodies (for POST/PUT)
 * and URL query parameters (for GET), returning appropriate 400 errors on failure.
 *
 * @template T The expected type of the validated data.
 * @param {z.ZodSchema<T>} schema The Zod schema to validate the request against.
 * @param {ValidatedRequestHandler<T>} handler The API route handler to execute upon successful validation.
 * @returns An API route handler that performs validation before execution.
 */
export const withValidation = <T>(
  schema: z.ZodSchema<T>,
  handler: ValidatedRequestHandler<T>
) => {
  return async (req: NextRequest) => {
    try {
      let dataToValidate: unknown

      // Determine the source of data based on the HTTP method
      if (req.method === 'GET') {
        // For GET requests, validate the URL query parameters
        dataToValidate = Object.fromEntries(req.nextUrl.searchParams)
      } else if (req.method === 'POST' || req.method === 'PUT') {
        // For POST/PUT requests, validate the JSON body
        dataToValidate = await req.json()
      } else {
        // For other methods (DELETE, etc.), we might not expect data.
        // The provided schema should be designed accordingly (e.g., z.object({})).
        dataToValidate = {}
      }

      // Parse the data against the schema
      const parsedData = await schema.parseAsync(dataToValidate)
      // If validation is successful, call the actual handler
      return handler(req, parsedData)
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const errorSource =
          req.method === 'GET' ? 'query parameters' : 'request body'
        return NextResponse.json(
          { error: `Invalid ${errorSource}`, details: error.issues },
          { status: 400 }
        )
      }
      // Handle JSON parsing errors for body-based requests
      if (error instanceof SyntaxError && req.method !== 'GET') {
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        )
      }
      // Log and return a generic error for any other exceptions
      console.error('Unhandled error in validation middleware:', error)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
