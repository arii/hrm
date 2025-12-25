import { z } from 'zod'

/**
 * A generic validation function that wraps `schema.parse(data)`.
 * This utility provides a consistent way to apply Zod validation and leverages
 * TypeScript's type inference to return a strongly-typed object on success.
 *
 * @param schema The Zod schema to use for validation.
 * @param data The unknown data to validate.
 * @returns The parsed and typed data, conforming to the schema.
 * @throws ZodError if validation fails, providing detailed error messages.
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data)
}
