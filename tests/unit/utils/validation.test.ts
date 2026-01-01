// tests/unit/utils/validation.test.ts
import { validate } from '@/utils/validation'
import { z } from 'zod'

describe('validate', () => {
  const schema = z.string().min(3, 'Too short')

  it('should return success for valid input', () => {
    const { success, issues } = validate('hello', schema)
    expect(success).toBe(true)
    expect(issues).toEqual([])
  })

  it('should return error for invalid input', () => {
    const { success, issues } = validate('hi', schema)
    expect(success).toBe(false)
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toBe('Too short')
  })
})
