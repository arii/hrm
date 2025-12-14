# Technical Debt & Refactoring Tasks

This document tracks technical debt and necessary refactoring tasks identified during code reviews and audits.

## High Priority

### 1. Refactor Token Delivery in `server.ts`
*   **Problem:** The current implementation uses "Callback Hell / Timing-Based Logic" (nested `setTimeout`) to handle token delivery. This is fragile and non-deterministic.
*   **Location:** `server.ts` (intercept logic for `API_INTERNAL_TOKEN_DELIVERY`) and `app/api/internal/token-delivery/route.ts`.
*   **Proposed Solution:** Implement an **Event-Driven Architecture**. The Next.js API route should directly notify the `spotifyService` (exposed via a singleton or shared module) when new tokens are available, removing the need for `setTimeout` and file watching race conditions.
*   **Reference:** `docs/audits/AUDIT_CODE_HYGIENE.md`

### 2. Robust `SpotifyPolling` Initialization
*   **Problem:** The `SpotifyPolling.create` method swallows errors and returns a "stub" service if initialization fails. This "Error Swallowing" masks critical failures.
*   **Location:** `server.ts` -> `SpotifyPolling.create`.
*   **Proposed Solution:** The server startup sequence should be robust. If a critical service like Spotify fails to initialize:
    *   The server should fail-fast (crash) in production, OR
    *   The health check endpoints (`/health/ready`) should explicitly report the service as unhealthy to prevent traffic routing.

## Medium Priority

### 3. Dependency Stabilization
*   **Problem:** Usage of pre-release/canary versions for critical packages (e.g., `next`, `express`).
*   **Proposed Solution:** Pin dependencies to stable versions.

### 4. Security Headers
*   **Problem:** Missing security headers (CSP, HSTS, X-Content-Type-Options).
*   **Proposed Solution:** Implement `helmet` or manual header configuration in `server.ts`.
