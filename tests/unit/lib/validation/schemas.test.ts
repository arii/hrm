/**
 * @jest-environment node
 */
import {
  UserProfileSchema,
  MeasurementSystemSchema,
  GenderSchema,
  UserPhysicalProfileSchema,
} from '@/lib/validation/schemas'
import { v4 as uuidv4 } from 'uuid'

describe('Zod Schema Validation', () => {
  describe('UserProfileSchema', () => {
    it('should correctly import and define the schema', () => {
      expect(UserProfileSchema).toBeDefined()
    })
  })

  describe('MeasurementSystemSchema', () => {
    it('should accept valid measurement systems', () => {
      expect(MeasurementSystemSchema.safeParse('IMPERIAL').success).toBe(true)
      expect(MeasurementSystemSchema.safeParse('METRIC').success).toBe(true)
    })

    it('should reject invalid measurement systems', () => {
      expect(MeasurementSystemSchema.safeParse('INVALID').success).toBe(false)
      expect(MeasurementSystemSchema.safeParse('').success).toBe(false)
    })
  })

  describe('GenderSchema', () => {
    it('should accept valid genders', () => {
      expect(GenderSchema.safeParse('MALE').success).toBe(true)
      expect(GenderSchema.safeParse('FEMALE').success).toBe(true)
    })

    it('should reject invalid genders', () => {
      expect(GenderSchema.safeParse('OTHER').success).toBe(false)
      expect(GenderSchema.safeParse('').success).toBe(false)
    })
  })

  describe('UserPhysicalProfileSchema', () => {
    const validProfile = {
      userId: uuidv4(),
      age: 30,
      weight: 75,
      gender: 'MALE',
      unitSystem: 'METRIC',
    }

    it('should accept a valid user physical profile', () => {
      expect(UserPhysicalProfileSchema.safeParse(validProfile).success).toBe(
        true
      )
    })

    it('should accept a valid profile with an optional maxHr', () => {
      const profileWithMaxHr = { ...validProfile, maxHr: 190 }
      expect(UserPhysicalProfileSchema.safeParse(profileWithMaxHr).success).toBe(
        true
      )
    })

    it('should reject a profile with an invalid userId', () => {
      const invalidProfile = { ...validProfile, userId: 'invalid-uuid' }
      expect(UserPhysicalProfileSchema.safeParse(invalidProfile).success).toBe(
        false
      )
    })

    it('should reject a profile with an invalid age', () => {
      const invalidProfile = { ...validProfile, age: 0 }
      expect(UserPhysicalProfileSchema.safeParse(invalidProfile).success).toBe(
        false
      )
    })

    it('should reject a profile with an invalid weight', () => {
      const invalidProfile = { ...validProfile, weight: -10 }
      expect(UserPhysicalProfileSchema.safeParse(invalidProfile).success).toBe(
        false
      )
    })

    it('should reject a profile with an invalid gender', () => {
      const invalidProfile = { ...validProfile, gender: 'INVALID' }
      expect(UserPhysicalProfileSchema.safeParse(invalidProfile).success).toBe(
        false
      )
    })

    it('should reject a profile with an invalid unitSystem', () => {
      const invalidProfile = { ...validProfile, unitSystem: 'INVALID' }
      expect(UserPhysicalProfileSchema.safeParse(invalidProfile).success).toBe(
        false
      )
    })
  })
})
