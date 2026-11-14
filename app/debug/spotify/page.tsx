import { notFound } from 'next/navigation'
import { isDebugBlocked } from '@/lib/debug-gate'
import { env } from '@/lib/env'
import SpotifyDebugContent from './SpotifyDebugContent'

/**
 * The gate must run per-request: with static prerendering the build-time
 * TESTING value would be baked in (the VRT build sets TESTING=true, which
 * would otherwise ship the debug page to production). (OQ-3a)
 */
export const dynamic = 'force-dynamic'

/**
 * Deliberately gated debug surface (spec art_uI0w7D6m D5 / OQ-3a): it exposes
 * token state and has no owner in the nav, so it renders 404 in production
 * builds. The VRT web server boots production with TESTING=true and keeps
 * exercising it (same convention as lib/debug-guard's API endpoints).
 */
export default function SpotifyDebugPage() {
  if (isDebugBlocked(env.NODE_ENV, env.TESTING)) {
    notFound()
  }

  return <SpotifyDebugContent />
}
