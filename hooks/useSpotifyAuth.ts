'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useError } from '@/context/ErrorContext'

/**
 * Custom hook to manage Spotify authentication.
 *
 * This hook centralizes the logic for handling the NextAuth session,
 * checking for token refresh errors, and initiating a sign-out if
 * the session becomes invalid. It provides a clear and reusable
 * interface for components that need to be aware of the user's
 * authentication state.
 *
 * @returns {object} The authentication state, including:
 * - `status`: The session status ('loading', 'authenticated', 'unauthenticated').
 * - `isLoggedIn`: A boolean indicating if the user is authenticated.
 * - `session`: The raw session object from NextAuth.
 */
export const useSpotifyAuth = () => {
  const { data: session, status } = useSession()
  const { addError } = useError()

  useEffect(() => {
    // Check for the specific error that NextAuth returns on token refresh failure
    if (session?.error === 'RefreshAccessTokenError') {
      addError('Spotify session expired. Please log in again.', {
        persist: true,
      })
      // Automatically sign out the user to clear the invalid session
      const signOutUser = async () => {
        await signOut()
      }
      signOutUser()
    }
  }, [session, addError])

  return {
    status,
    isLoggedIn: status === 'authenticated',
    session,
  }
}
