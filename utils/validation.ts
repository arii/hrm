import {
  ValidationRule,
  ValidationRuleType,
} from '@/components/shared/ValidatedTextField'

/**
 * Default error messages for validation rules.
 */
const defaultErrorMessages: Record<ValidationRuleType, string> = {
  required: 'This field is required.',
  email: 'Invalid email address.',
  positiveInteger: 'Must be a positive integer.',
  minLength: 'Value is too short.',
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
  customMessages: Partial<Record<ValidationRuleType, string>> = {}
): { isValid: boolean; message: string | null } => {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!value) {
          return {
            isValid: false,
            message: customMessages.required ?? defaultErrorMessages.required,
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
      case 'minLength':
        if (value.length < rule.value) {
          return {
            isValid: false,
            message: `Must be at least ${rule.value} characters.`,
          }
        }
        break
    }
  }

  return { isValid: true, message: null }
}
