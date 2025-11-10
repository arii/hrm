# Spotify Token Refresh Hardening Plan

This plan outlines the investigative and implementation steps required to ensure Spotify access tokens are refreshed automatically when they expire. Execution should follow the phases below; do **not** implement until the plan is reviewed and approved.

## 1. Baseline Assessment

- Document current token lifecycle: capture how `token-delivery` stores tokens, how the `SpotifyTokenManager` loads and refreshes them, and where `SpotifyPolling` attempts to refresh.
- Reproduce the reported issue by allowing the token to expire while the server and dashboard remain idle; collect logs from `services/spotifyPolling.ts` and `services/spotifyTokenManager.ts`.
- Verify whether the client session token (surfaced via `/api/spotify/access-token`) is expiring independently from the server token and note any mismatch.

## 2. Diagnostics & Instrumentation

- Add targeted logging (temporarily) around `SpotifyTokenManager.getValidAccessToken`, the 55-minute refresh interval in `SpotifyPolling`, and the NextAuth JWT callback to confirm refresh attempts.
- Capture HTTP status codes and response bodies for failed refresh attempts; identify if failover paths (e.g., clearing tokens) are triggered.
- Confirm environment secrets (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXTAUTH_SECRET`) are consistent across dev and production.

## 3. Interim Safeguards

- Create operational runbook instructions for manually clearing `logs/spotify_tokens.json` and reauthenticating if refresh fails.
- Determine monitoring hooks (e.g., log alerts) that can notify operators when token refresh attempts fail repeatedly.

## 4. Implementation Strategy (Deferred)

- Decide whether the refresh logic should be centralized in `SpotifyTokenManager` with explicit scheduling, or coordinated via NextAuth token callbacks.
- Plan API surface changes (if any) so the server can request a fresh access token on demand without relying solely on cached values.
- Outline unit/integration tests: mock Spotify token endpoints, simulate expiry, and assert that `SpotifyPolling` recovers without manual intervention.

## 5. Validation & Rollout

- Draft a QA checklist covering new log messages, error handling, and token persistence.
- Define rollback steps should the refreshed logic introduce regressions.
- Schedule staged deployment: dev sandbox → internal staging → production.

## 6. Open Questions

- Should the Web Playback SDK rely on its own token refresh flow, or should the server expose an API that always returns the latest access token from `SpotifyTokenManager`?
- How will concurrent server instances coordinate refresh operations to avoid race conditions and rate limits?
- Do we need to rotate or encrypt `spotify_tokens.json` for additional security once refresh works reliably?

---

**Next Action:** Review this plan with stakeholders, adjust scope, then proceed with instrumentation work (Phase 2) before any code changes are committed.
