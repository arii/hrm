// File: app/api/auth/[...nextauth]/route.ts (NextAuth Configuration - Spotify OAuth Gateway)
/**
 * NextAuth Configuration File: Handles the Spotify OAuth 2.0 flow.
 * CRITICAL: This route intercepts the refresh token and sends it to the persistent
 * server service via the internal /internal/token-delivery endpoint.
 */
import { GET, POST } from '@/lib/auth'

export { GET, POST }
