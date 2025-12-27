// tests/test-data/user-data-factory.ts
import { UserProfile } from '@/types/core'

export const createUserProfile = (
  overrides: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> => ({
  username: 'johndoe',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  ...overrides,
})
