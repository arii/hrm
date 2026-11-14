/**
 * Pure production gate for debug surfaces (spec art_uI0w7D6m D5 / OQ-3a).
 * Blocked in production unless the TESTING bypass is set. Playwright/VRT
 * runs production builds with TESTING=true (see playwright.config.ts
 * webServer env); the real prod deploy never sets TESTING, so debug
 * surfaces stay dark there.
 *
 * Client-safe: no next/server imports, so it can gate both the debug page
 * and (via lib/debug-guard.ts) the debug API endpoints.
 */
export function isDebugBlocked(
  nodeEnv: string | undefined,
  testing: string | undefined
): boolean {
  return nodeEnv === 'production' && testing !== 'true'
}
