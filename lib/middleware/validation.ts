import { Request, Response, NextFunction } from 'express'
import { AnyZodObject } from 'zod'
import logger from '../../utils/logger.js'

/**
 * A higher-order function that creates an Express middleware for validating
 * the request body against a given Zod schema.
 *
 * @param schema - The Zod schema to validate against.
 * @returns An Express middleware function.
 */
export const withValidation =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      logger.error({ errors }, 'Request body validation failed')
      return res.status(400).json({
        message: 'Invalid request body',
        errors,
      })
    }

    // Attach the parsed and validated data to the request object
    // This allows subsequent handlers to use the typed data safely
    req.body = result.data
    return next()
  }
