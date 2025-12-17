/**
 * @file This file contains the withValidation middleware for App Router API routes.
 * It is designed to be a flexible and reusable solution for validating incoming
 * requests using Zod schemas for the request body, query parameters, and route
 * parameters.
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Defines the schemas for validating different parts of an incoming request.
 * @template B The expected type of the request body.
 * @template Q The expected type of the query parameters.
 * @template P The expected type of the route parameters.
 */
interface ValidationSchemas<B, Q, P> {
  body?: z.ZodType<B>;
  query?: z.ZodType<Q>;
  params?: z.ZodType<P>;
}

/**
 * Defines the shape of the context object passed to the API route handler.
 * It contains the validated data from the request body, query, and params.
 * Types are inferred from the provided Zod schemas.
 */
type ValidatedContext<S extends ValidationSchemas<any, any, any>> = {
  body: S['body'] extends z.ZodType ? z.infer<S['body']> : undefined;
  query: S['query'] extends z.ZodType ? z.infer<S['query']> : undefined;
  params: S['params'] extends z.ZodType
    ? z.infer<S['params']>
    : Record<string, string | string[] | undefined>;
};

/**
 * Defines the type for an App Router API route handler that uses the
 * withValidation middleware. It receives the original request and a context
 * object containing the validated data.
 */
type AppRouterHandler<S extends ValidationSchemas<any, any, any>> = (
  req: Request,
  context: ValidatedContext<S>
) => Promise<NextResponse>;

/**
 * A higher-order function that wraps an App Router API route handler to provide
 * automatic request validation using Zod schemas for the body, query, and params.
 *
 * @template S The type of the validation schemas object.
 * @param {S} schemas An object containing Zod schemas for `body`, `query`, and/or `params`.
 * @returns A function that takes a handler and returns a new handler with validation logic.
 *
 * @example
 * // Basic POST request body validation
 * import { withValidation } from '@/lib/middleware/validation';
 * import { CreateUserSchema } from '@/lib/validation/schemas';
 *
 * async function postHandler(req, { body }) {
 *   // 'body' is now guaranteed to match CreateUserSchema
 * }
 * export const POST = withValidation({ body: CreateUserSchema })(postHandler);
 *
 * @example
 * // GET request with query parameter validation
 * import { z } from 'zod';
 * const SearchQuerySchema = z.object({ q: z.string() });
 *
 * async function getHandler(req, { query }) {
 *   // 'query.q' is a validated string
 * }
 * export const GET = withValidation({ query: SearchQuerySchema })(getHandler);
 */
export function withValidation<S extends ValidationSchemas<any, any, any>>(
  schemas: S
) {
  return (handler: AppRouterHandler<S>) =>
    async (
      req: Request,
      context: { params: Record<string, string | string[] | undefined> }
    ) => {
      try {
        let validatedBody: any;
        if (schemas.body) {
          const body = await req.json();
          validatedBody = schemas.body.parse(body);
        }

        let validatedQuery: any;
        if (schemas.query) {
          const { searchParams } = new URL(req.url);
          const queryData: { [key: string]: string | string[] } = {};
          const keys = Array.from(searchParams.keys());
          for (const key of new Set(keys)) {
            const allVals = searchParams.getAll(key);
            queryData[key] = allVals.length > 1 ? allVals : allVals[0];
          }
          validatedQuery = schemas.query.parse(queryData);
        }

        let validatedParams: any;
        if (schemas.params) {
          validatedParams = schemas.params.parse(context.params);
        } else {
          validatedParams = context.params; // Pass through if no schema
        }

        const validatedContext = {
          body: validatedBody,
          query: validatedQuery,
          params: validatedParams,
        };

        return handler(req, validatedContext as ValidatedContext<S>);
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
          );
        }

        // Handle cases where req.json() fails (e.g., empty or malformed body)
        if (error instanceof SyntaxError) {
          return NextResponse.json(
            { message: 'Invalid JSON in request body.' },
            { status: 400 }
          );
        }

        console.error('Unhandled error in withValidation:', error);
        return NextResponse.json(
          { message: 'An internal server error occurred.' },
          { status: 500 }
        );
      }
    };
}
