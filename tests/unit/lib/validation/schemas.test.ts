/**
 * @jest-environment node
 */
import { UserPhysicalProfileSchema } from '@/lib/validation/schemas'

describe('Schema Imports', () => {
  it('should correctly import and define Zod schemas', () => {
    expect(UserPhysicalProfileSchema).toBeDefined()
  })
})
