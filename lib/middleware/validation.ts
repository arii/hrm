/**
 * @file This file contains the withValidation middleware for App Router API routes.
 * It provides a higher-order function to validate request bodies, URL parameters,
 * and headers using Zod schemas.
 *
 * @see /docs/api-validation.md
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { z, ZodError, ZodIssue } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Defines the Zod schemas for validating different parts of a request.
 * @template B The expected type of the request body.
 * @template P The expected type of the URL parameters.
 * @template H The expected type of the request headers.
 */
export interface ValidationSchemas<B = unknown, P = unknown, H = unknown> {
  body?: z.ZodSchema<B>
  params?: z.ZodSchema<P>
  headers?: z.ZodSchema<H>
}

/**
 * Defines the type for an App Router API route handler that uses the
 * `withValidation` middleware. It receives the original request and a context
 * object with the parsed, validated data.
 *
 * @template B The validated request body type.
 * @template P The validated URL parameters type.
 * @template H The validated request headers type.
 */
type AppRouterHandler<B, P, H> = (
  req: NextRequest,
  context: {
    body: B
    params: P
    headers: H
  }
) => Promise<NextResponse>

/**
 * Represents a single validation error detail, conforming to the standardized
 * error response format.
 */
interface ValidationErrorDetail {
  location: 'body' | 'params' | 'headers'
  path: string
  message: string
}

/**
 * Formats a ZodError into an array of structured validation error details.
 * @param {ZodError} error The ZodError to format.
 * @param {'body' | 'params' | 'headers'} location The part of the request where the error occurred.
 * @returns {ValidationErrorDetail[]} An array of formatted error details.
 */
const formatZodError = (
  error: ZodError,
  location: 'body' | 'params' | 'headers'
): ValidationErrorDetail[] => {
  return error.issues.map((issue: ZodIssue) => ({
    location,
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * A higher-order function that wraps an App Router API route handler to provide
 * automatic request validation using Zod schemas for the body, URL parameters,
 * and headers.
 *
 * @template B The expected type of the validated request body.
 * @template P The expected type of the validated URL parameters.
 * @template H The expected type of the validated request headers.
 * @param {ValidationSchemas<B, P, H>} schemas An object containing Zod schemas for validation.
 * @returns A function that takes a handler and returns a new handler with validation logic.
 *
 * @example
 * // pages/api/users/[userId].ts
 * import { withValidation } from '@/lib/middleware/validation';
 * import { z } from 'zod';
 *
 * const schemas = {
 *   params: z.object({ userId: z.string().uuid() }),
 *   body: z.object({ name: z.string() }),
 * };
 *
 * // The generic types for the handler are inferred from the schemas.
 * async function putHandler(req, { params, body }) {
 *   // params.userId is a validated UUID string
 *   // body.name is a validated string
 *   // ...
 * }
 *
 * export const PUT = withValidation(schemas)(putHandler);
 */
export function withValidation<B, P, H>(schemas: ValidationSchemas<B, P, H>) {
  return (handler: AppRouterHandler<B, P, H>) =>
    async (req: NextRequest, context: { params: unknown }) => {
      const errors: ValidationErrorDetail[] = []
      let parsedBody: B | undefined
      let parsedParams: P | undefined
      let parsedHeaders: H | undefined

      // 1. Validate Headers
      if (schemas.headers) {
        // Convert Headers object to a plain object for Zod parsing.
        const headersObject = Object.fromEntries(req.headers.entries())
        const result = schemas.headers.safeParse(headersObject)
        if (result.success) {
          parsedHeaders = result.data
        } else {
          errors.push(...formatZodError(result.error, 'headers'))
        }
      }

      // 2. Validate URL Parameters
      if (schemas.params) {
        const result = schemas.params.safeParse(context.params)
        if (result.success) {
          parsedParams = result.data
        } else {
          errors.push(...formatZodError(result.error, 'params'))
        }
      }

      // 3. Validate Request Body
      if (schemas.body) {
        try {
          const body = await req.json()
          const result = schemas.body.safeParse(body)
          if (result.success) {
            parsedBody = result.data
          } else {
            errors.push(...formatZodError(result.error, 'body'))
          }
        } catch (_error) {
          // Catch any error during body parsing (e.g., empty body, malformed JSON)
          // and treat it as a validation failure.
          errors.push({
            location: 'body',
            path: '',
            message: 'Request body is not valid JSON.',
          })
        }
      }

      // If any validation errors occurred, return a 400 response
      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors,
          },
          { status: 400 }
        )
      }

      // If all validations pass, call the original handler with the parsed data.
      return handler(req, {
        body: parsedBody as B,
        params: parsedParams as P,
        headers: parsedHeaders as H,
      })
    }
}
