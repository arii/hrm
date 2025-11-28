// File: lib/auth/utils.ts
/**
 * Description: Centralized utility functions for authentication and authorization.
 * This module provides reusable functions to verify user sessions, check permissions,
 * and handle other security-related tasks across the application.
 */

import { getServerSession } from 'next-auth'
import { decode } from 'next-auth/jwt'
import { authOptions } from '../auth'
import { JWT_SECRET } from './consts'
import { DecodedToken, SessionToken } from './types'

/**
 * Verifies and decodes a session token.
 * This function can be used on the server-side to validate a token provided
 * by a client (e.g., in an API request or WebSocket handshake).
 *
 * @param token - The encrypted session token from the client.
 * @returns A promise that resolves to the decoded token if valid, otherwise null.
 */
export const decodeSessionToken = async (
  token: string
): Promise<DecodedToken | null> => {
  try {
    // Use the decode function from next-auth/jwt to verify and decrypt the token
    const decodedToken = await decode({
      token,
      secret: JWT_SECRET,
    })

    // If decoding is successful and we have a subject (user ID), return the payload
    if (decodedToken && decodedToken.sub) {
      return {
        userId: decodedToken.sub,
        ...decodedToken,
      }
    }

    return null
  } catch (error) {
    console.error('Failed to decode session token:', error)
    return null
  }
}

/**
 * Retrieves the current user's session from the server-side context.
 * This is a wrapper around `getServerSession` to ensure consistent usage
 * of the application's `authOptions`.
 *
 * @returns A promise that resolves to the user's session object or null.
 */
export const getCurrentUser = async (): Promise<SessionToken | null> => {
  const session = await getServerSession(authOptions)
  return session
}

/**
 * A middleware-style function to protect API routes.
 * It checks for a valid session and returns a 401 Unauthorized response if none is found.
 *
 * @param req - The Node.js request object.
 * @param res - The Node.js response object.
 * @param next - The callback to proceed to the next handler.
 */
export const protectRoute = async (
  _req: any,
  res: any,
  next: () => void
): Promise<void> => {
  const session = await getCurrentUser()
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
