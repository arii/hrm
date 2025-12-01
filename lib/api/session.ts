// File: lib/api/session.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { UnauthorizedError } from '@/lib/errors'

/**
 * Validates the NextAuth.js session from the server-side context.
 * Throws an UnauthorizedError if the session is not found or invalid.
 * @returns {Promise<import('next-auth').Session>} The validated session object.
 */
export async function validateSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new UnauthorizedError('No session found')
  }
  return session
}
