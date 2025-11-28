// File: lib/auth/types.ts
/**
 * Description: Contains TypeScript type definitions and interfaces for
 * authentication and authorization objects, such as decoded tokens and
 * user session data.
 */

/**
 * Represents the decoded payload of a JWT session token.
 * This is the data that is available after a token has been successfully
 * verified and decrypted.
 */
export interface DecodedToken {
  userId: string
  [key: string]: any // Allows for other properties
}

/**
 * Represents the user's session object, typically derived from NextAuth.
 * This may be extended with additional application-specific user properties.
 */
export interface SessionToken {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  accessToken?: string
  error?: string
}

/**
 * Defines the structure of the WebSocket authentication message.
 * Clients must send a message of this type to identify themselves.
 */
export interface WebSocketAuthMessage {
  type: 'IDENTIFY'
  token: string // The encrypted session token
}
