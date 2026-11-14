import { notFound } from 'next/navigation'
import { isDebugBlocked } from '@/lib/debug-gate'
import { env } from '@/lib/env'
import SpotifyDebugContent from './SpotifyDebugContent'

/**
 * Deliberately gated debug surface (spec art_uI0w7D6m D5 / OQ-3a): it exposes
 * token state and has no owner in the nav, so it renders 404 in production
 * builds. The VRT harness boots production with TESTING=true and keeps
 * exercising it (same convention as lib/debug-guard's API endpoints).
 */
export default function SpotifyDebugPage() {
  if (isDebugBlocked(env.NODE_ENV, env.TESTING)) {
    notFound()
  }

  return <SpotifyDebugContent />
}
