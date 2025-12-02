// lib/middleware/validation.ts
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

type RouteHandler = (
  req: NextRequest,
  ...args: unknown[]
) => Promise<NextResponse>

export const withValidation =
  <TRequest, TResponse>(
    requestSchema: z.ZodSchema<TRequest>,
    responseSchema: z.ZodSchema<TResponse>,
    handler: RouteHandler
  ) =>
  async (req: NextRequest, ...args: unknown[]) => {
    try {
      // 1. Validate Request Body
      const body = await req.json()
      const parsedBody = requestSchema.parse(body)
      ;(req as NextRequest & { parsedBody: TRequest }).parsedBody = parsedBody
    } catch (error) {
      if (error instanceof SyntaxError) {
        return new NextResponse(
          JSON.stringify({ message: 'Invalid JSON body' }),
          { status: 400 }
        )
      }
      // Handle other potential errors during body parsing if necessary
      throw error // Re-throw to be caught by the outer try-catch
    }

    try {

      // 2. Execute the Route Handler
      const response = await handler(req, ...args)

      // 3. Validate Response Body only for 200 OK responses with a body
      if (response.status === 200) {
        const jsonResponse = await response.json()
        responseSchema.parse(jsonResponse)

        // Recreate the response since the body has been consumed
        return new NextResponse(JSON.stringify(jsonResponse), {
          status: response.status,
          headers: response.headers,
        })
      }

      return response
    } catch (error) {
      if (error instanceof z.ZodError) {
        // This will now catch both request and response validation errors
        return new NextResponse(
          JSON.stringify({
            message: 'Validation failed',
            errors: error.errors,
          }),
          { status: 400 }
        )
      }

      // Log the unexpected error for debugging purposes
      console.error('Unhandled error in validation middleware:', error)

      return new NextResponse(
        JSON.stringify({ message: 'An unexpected error occurred' }),
        { status: 500 }
      )
    }
  }
