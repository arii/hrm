// File: lib/auth/consts.ts
/**
 * Description: Defines constants used throughout the authentication and
 * authorization modules. This includes cookie names, token expiration times,
 * and other security-related magic strings and numbers.
 */

// The name of the cookie used to store the session token.
export const SESSION_COOKIE_NAME = '__hrm_session'

// The maximum age of a session in seconds (e.g., 30 days).
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60

// The secret key used for signing and encrypting JWTs.
// It's critical that this is loaded from environment variables and not hardcoded.
export const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default_secret'

// Defines the WebSocket message type for client authentication.
export const WEBSOCKET_AUTH_MESSAGE_TYPE = 'IDENTIFY'
