// This file will contain the mock session logic.
// It will export a function to get the current user's session.

import type { UserProfile } from '@/types/core'

// In a real application, you would get this from your authentication provider.
const MOCK_USER: UserProfile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'mockuser',
  email: 'mockuser@example.com',
  firstName: 'Mock',
  lastName: 'User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const getMockedSession = (): { user: UserProfile } | null => {
  // Simulate a logged-in user.
  // In a real app, this would involve checking for a valid session cookie or token.
  return {
    user: MOCK_USER,
  }
}
