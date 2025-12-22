import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { fromZodError } from 'zod-validation-error'

// Define a type for the schemas object
interface ValidationSchemas<
  TBody,
  TQuery,
  TParams,
  THeaders extends Record<string, unknown>,
> {
  bodySchema?: ZodSchema<TBody>
  querySchema?: ZodSchema<TQuery>
  paramsSchema?: ZodSchema<TParams>
  headersSchema?: ZodSchema<THeaders>
}

// Define the type for the validated data that will be passed to the handler
export interface ValidatedData<
  TBody,
  TQuery,
  TParams,
  THeaders extends Record<string, unknown>,
> {
  body: TBody
  query: TQuery
  params: TParams
  headers: THeaders
}

// Minimal RouteContext to ensure params are expected
interface RouteContext {
  params: unknown
}

type Handler<
  TBody,
  TQuery,
  TParams,
  THeaders extends Record<string, unknown>,
> = (
  req: NextRequest,
  context: RouteContext & {
    validatedData: ValidatedData<TBody, TQuery, TParams, THeaders>
  }
) => Promise<NextResponse> | NextResponse

/**
 * A higher-order function to validate request body, query, and params using Zod.
 *
 * @param schemas - An object containing Zod schemas for 'body', 'query', and 'params'.
 * @returns A wrapped Next.js API route handler.
 */
export function withValidation<
  TBody,
  TQuery,
  TParams,
  THeaders extends Record<string, unknown>,
>(
  schemas: ValidationSchemas<TBody, TQuery, TParams, THeaders>
): (
  handler: Handler<TBody, TQuery, TParams, THeaders>
) => (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return (handler) => async (req, context) => {
    try {
      const { bodySchema, querySchema, paramsSchema, headersSchema } = schemas
      let body: TBody | undefined
      let query: TQuery | undefined
      let params: TParams | undefined
      let headers: THeaders | undefined

      // Validate request body
      if (bodySchema) {
        const textBody = await req.text()
        if (textBody === '') {
          return NextResponse.json(
            { message: 'Request body cannot be empty.' },
            { status: 400 }
          )
        }
        try {
          const parsedBody = JSON.parse(textBody)
          const validationResult = bodySchema.safeParse(parsedBody)
          if (!validationResult.success) {
            const validationError = fromZodError(validationResult.error)
            return NextResponse.json(
              {
                message: 'Validation failed',
                errors: validationError.details,
              },
              { status: 400 }
            )
          }
          body = validationResult.data
        } catch (e) {
          if (e instanceof SyntaxError) {
            return NextResponse.json(
              { message: 'Invalid JSON in request body.' },
              { status: 400 }
            )
          }
          throw e // Re-throw other errors
        }
      }

      // Validate query parameters
      if (querySchema) {
        const { searchParams } = new URL(req.url)
        const queryAsObject = Object.fromEntries(searchParams.entries())
        const validationResult = querySchema.safeParse(queryAsObject)

        if (!validationResult.success) {
          const validationError = fromZodError(validationResult.error)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationError.details,
            },
            { status: 400 }
          )
        }
        query = validationResult.data
      }

      // Validate route parameters
      if (paramsSchema) {
        const validationResult = paramsSchema.safeParse(context.params)
        if (!validationResult.success) {
          const validationError = fromZodError(validationResult.error)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationError.details,
            },
            { status: 400 }
          )
        }
        params = validationResult.data
      }

      // Validate headers
      if (headersSchema) {
        const headersAsObject = Object.fromEntries(req.headers.entries())
        const validationResult = headersSchema.safeParse(headersAsObject)
        if (!validationResult.success) {
          const validationError = fromZodError(validationResult.error)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationError.details,
            },
            { status: 400 }
          )
        }
        headers = validationResult.data
      }

      // If all validations pass, call the original handler
      const validatedData = {
        body: body as TBody,
        query: query as TQuery,
        params: params as TParams,
        headers: headers as THeaders,
      }

      return handler(req, { ...context, validatedData })
    } catch (error) {
      console.error('An unexpected error occurred in withValidation:', error)
      return NextResponse.json(
        { message: 'An internal server error occurred.' },
        { status: 500 }
      )
    }
  }
}
