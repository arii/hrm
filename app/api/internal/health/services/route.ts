// app/api/internal/health/services/route.ts
import { NextResponse } from 'next/server'

/**
 * Reports stateful service initialization (same-process globals set by
 * createServices in lib/services.ts). Consumed by /api/health/detailed.
 * No secrets exposed: booleans only, safe to leave unauthenticated like
 * the other health endpoints.
 */
export async function GET() {
  const spotifyInitialized = global.isSpotifyInitialized === true
  const tabataInitialized =
    global.tabataService !== undefined && global.tabataService !== null
  const healthy = spotifyInitialized && tabataInitialized

  return NextResponse.json({
    healthy,
    details: {
      service: 'internal-services',
      spotifyInitialized,
      tabataInitialized,
    },
  })
}
