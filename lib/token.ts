// File: lib/token.ts (JWT Verification Utility)
import { getToken } from 'next-auth/jwt'
import { NextApiRequest } from 'next'

// The secret used to sign the JWTs.
const secret = process.env.NEXTAUTH_SECRET

if (!secret) {
  throw new Error('NEXTAUTH_SECRET is not set')
}

/**
 * Verifies a JWT token from a WebSocket connection request.
 *
 * @param token The raw JWT string from the 'token' query parameter.
 * @returns A promise that resolves with the decoded token payload if valid.
 * @throws An error if the token is missing, invalid, or expired.
 */
export async function verifyToken(token: string | null) {
  if (!token) {
    throw new Error('No token provided')
  }

  const req = {
    headers: {
      cookie: `next-auth.session-token=${token}`,
    },
  } as NextApiRequest
  const decodedToken = await getToken({ req, secret: secret as string })

  if (!decodedToken) {
    throw new Error('Invalid token')
  }

  return decodedToken
}
