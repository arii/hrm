/**
 * @jest-environment jsdom
 */
import { UserSettingsSchema } from '../../../../lib/validation/userSettingsValidation'

describe('UserSettingsSchema', () => {
  const validData = {
    userName: 'John Doe',
    userAge: 30,
    userWeight: 70,
  }

  // Test cases for userName
  it('should validate a valid user name', () => {
    const result = UserSettingsSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should invalidate an empty user name', () => {
    const result = UserSettingsSchema.safeParse({ ...validData, userName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required.')
    }
  })

  // Test cases for userAge
  it('should validate a valid user age', () => {
    const result = UserSettingsSchema.safeParse({ ...validData, userAge: 30 })
    expect(result.success).toBe(true)
  })

  it('should invalidate an age less than 1', () => {
    const result = UserSettingsSchema.safeParse({ ...validData, userAge: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Age must be at least 1.')
    }
  })

  it('should invalidate an age greater than 120', () => {
    const result = UserSettingsSchema.safeParse({ ...validData, userAge: 121 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Age must be 120 or less.')
    }
  })

  it('should invalidate a non-numeric age', () => {
    const result = UserSettingsSchema.safeParse({
      ...validData,
      userAge: 'abc' as any,
    })
    expect(result.success).toBe(false)
  })

  // Test cases for userWeight
  it('should validate a valid user weight', () => {
    const result = UserSettingsSchema.safeParse({ ...validData, userWeight: 70 })
    expect(result.success).toBe(true)
  })

  it('should invalidate a non-positive user weight', () => {
    const result = UserSettingsSchema.safeParse({ ...validData, userWeight: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Weight must be a positive number.'
      )
    }
  })

  it('should invalidate a non-numeric weight', () => {
    const result = UserSettingsSchema.safeParse({
      ...validData,
      userWeight: 'abc' as any,
    })
    expect(result.success).toBe(false)
  })
})
