import { type ValidationRule } from '@/components/shared/ValidatedTextField'

/**
 * Default error messages for validation rules.
 */
const defaultErrorMessages: Record<string, string> = {
  required: 'This field is required.',
  email: 'Invalid email address.',
  positiveInteger: 'Must be a positive integer.',
}

/**
 * Validates a value against a set of rules.
 * @param value - The value to validate.
 * @param rules - An array of validation rules.
 * @param customMessages - Optional custom error messages.
 * @returns An object with `isValid` and an error `message`.
 */
export const validate = (
  value: string,
  rules: ValidationRule[],
  customMessages: Partial<Record<string, string>> = {}
): { isValid: boolean; message: string | null } => {
  for (const rule of rules) {
    if (typeof rule === 'string') {
      switch (rule) {
        case 'required':
          if (!value) {
            return {
              isValid: false,
              message:
                customMessages.required ?? defaultErrorMessages.required,
            }
          }
          break
        case 'email':
          if (value && !/\S+@\S+\.\S+/.test(value)) {
            return {
              isValid: false,
              message: customMessages.email ?? defaultErrorMessages.email,
            }
          }
          break
        case 'positiveInteger':
          if (value && !/^\d+$/.test(value)) {
            return {
              isValid: false,
              message:
                customMessages.positiveInteger ??
                defaultErrorMessages.positiveInteger,
            }
          }
          break
      }
    } else if (typeof rule === 'object' && 'minLength' in rule) {
      if (value.length < rule.minLength) {
        return {
          isValid: false,
          message:
            customMessages.minLength ??
            `Must be at least ${rule.minLength} characters.`,
        }
      }
    }
  }

  return { isValid: true, message: null }
}
