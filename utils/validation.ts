// utils/validation.ts
import { ZodIssue, ZodSchema } from 'zod'

/**
 * Validates a value against a Zod schema and returns the result.
 *
 * @param value - The value to validate.
 * @param schema - The Zod schema to validate against.
 * @returns An object containing the validation result.
 */
export const validate = (
  value: unknown,
  schema: ZodSchema
): { success: boolean; issues: ZodIssue[] } => {
  const result = schema.safeParse(value)
  if (result.success) {
    return { success: true, issues: [] }
  } else {
    return { success: false, issues: result.error.issues }
  }
}
