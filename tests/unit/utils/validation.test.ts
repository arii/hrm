// tests/unit/utils/validation.test.ts
import { validate } from '@/utils/validation'
import { ValidationRule } from '@/components/shared/ValidatedTextField'

describe('Validation Utility', () => {
  it('should validate required fields', () => {
    const rules: ValidationRule[] = [{ type: 'required' }]
    expect(validate(' ', rules).isValid).toBe(true)
    expect(validate('a', rules).isValid).toBe(true)
    expect(validate('', rules).isValid).toBe(false)
  })

  it('should validate email addresses', () => {
    const rules: ValidationRule[] = [{ type: 'email' }]
    expect(validate('test@test.com', rules).isValid).toBe(true)
    expect(validate('test', rules).isValid).toBe(false)
  })

  it('should validate positive integers', () => {
    const rules: ValidationRule[] = [{ type: 'positiveInteger' }]
    expect(validate('123', rules).isValid).toBe(true)
    expect(validate('abc', rules).isValid).toBe(false)
  })

  it('should validate min length', () => {
    const rules: ValidationRule[] = [{ type: 'minLength', value: 5 }]
    expect(validate('12345', rules).isValid).toBe(true)
    expect(validate('1234', rules).isValid).toBe(false)
  })
})
