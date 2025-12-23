/**
 * @file This file contains utility functions for data validation.
 */
import { z } from '../zod'

/**
 * A simple validation utility that wraps Zod's parse method.
 *
 * @template T - The type of the Zod schema.
 * @param {T} schema - The Zod schema to validate against.
 * @param {unknown} data - The data to validate.
 * @returns {z.infer<T>} - The validated data, conforming to the schema's inferred type.
 * @throws {z.ZodError} - Throws a ZodError if validation fails, which can be caught and handled.
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data)
}
