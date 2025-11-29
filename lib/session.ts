// File: lib/session.ts (Centralized Server-Side Session Utility)
import { getServerSession as originalGetServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextApiRequest, NextApiResponse } from 'next'
import { IncomingMessage } from 'http'

/**
 * Wraps `next-auth`'s `getServerSession` to provide a unified interface
 * for retrieving the session in different server-side contexts.
 *
 * @param req - The incoming request object (optional).
 * @param res - The server response object (optional).
 * @returns A promise that resolves to the user's session, or null if not authenticated.
 */
export const getServerSession = async (
  req?: IncomingMessage | NextApiRequest,
  res?: NextApiResponse
) => {
  // If req and res are provided (e.g., in a traditional Node.js server context),
  // use them to get the session.
  if (req && res) {
    return await originalGetServerSession(req, res, authOptions)
  }

  // Otherwise, assume we are in a Next.js API Route or RSC and use headers().
  return await originalGetServerSession(authOptions)
}

/**
 * Retrieves the session from the server-side context using headers.
 * This is the preferred way to get the session in Next.js 13+ App Router.
 */
export const getSessionFromHeaders = async () => {
  const session = await originalGetServerSession(authOptions)
  return session
}
