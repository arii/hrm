/**
 * @jest-environment node
 */
import { UserProfileSchema } from '@/lib/validation/schemas'

describe('Schema Imports', () => {
  it('should correctly import and define Zod schemas', () => {
    expect(UserProfileSchema).toBeDefined()
  })
})
