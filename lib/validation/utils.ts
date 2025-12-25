import { z } from 'zod'

/**
 * A generic validation function that wraps `schema.parse(data)`.
 *
 * @param schema The Zod schema to use for validation.
 * @param data The data to validate.
 * @returns The parsed data.
 * @throws ZodError if validation fails.
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data)
}
