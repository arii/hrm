# [Audit] Code Hygiene & Operational Standards

## Summary

This audit identifies a mix of strong foundational practices and critical technical debt. While the project benefits from a very strict TypeScript configuration and good security measures like rate limiting, these are undermined by unstable dependencies, build process hacks, and legacy coding patterns in the core server logic. Addressing these issues is crucial for improving the long-term stability, security, and maintainability of the application.

## CI/CD & GitHub Actions Guidelines

**Token Usage**: The use of `secrets.ARI_PAT` (Personal Access Token) in GitHub Actions workflows is intentionally configured and should NOT be flagged for replacement with `github.token`. This choice is deliberate for operational requirements.

## Static Analysis Findings

| File / Area     | Issue                                                                                                                                               | Severity   | Recommended Fix                                                                                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`  | **Unstable Dependencies**: The project uses pre-release/canary versions for critical packages (e.g., `next@16.0.8`, `express@^5.1.0`).              | **High**   | Pin all dependencies to the latest stable major or minor versions. Avoid using canary, alpha, or beta releases in a production-oriented application to ensure stability and security.                                                                                                          |
| `package.json`  | **Build Script Hack**: The `build:server` script uses `cp dist/server.js dist/server.mjs`.                                                          | **Medium** | Resolve the underlying module resolution issue. This likely involves aligning the `module` and `moduleResolution` settings in `tsconfig.build.json` with the project's `"type": "module"` setting to produce the correct file output natively.                                                 |
| `tsconfig.json` | **(No Issues Found)**: The TypeScript configuration is excellent. It is commendably strict, enforcing a high level of code quality and type safety. | **None**   | Maintain this level of strictness.                                                                                                                                                                                                                                                             |
| `server.ts`     | **Error Swallowing**: The `SpotifyPolling.create` `try...catch` block creates a "stub" service on failure.                                          | **High**   | Implement a more robust health check and startup sequence. If a critical service like Spotify fails to initialize, the server should either fail to start (fail-fast) or the `/health/ready` endpoint should report as unhealthy, preventing traffic from being routed to a degraded instance. |

## Server/Security Misconfigurations

| File        | Issue                                                                                                                                                                                           | Impact                                                                                                                                                                     | Recommended Fix                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.ts` | **Missing Security Headers**: The Express server is not configured with common security headers like `X-Content-Type-Options`, `Strict-Transport-Security`, or a Content Security Policy (CSP). | **Medium Risk**: Leaves the application more vulnerable to common web attacks like clickjacking and cross-site scripting (XSS).                                            | Use a middleware package like `helmet` to apply secure default HTTP headers, or configure them manually according to security best practices.                  |
| `server.ts` | **Unsafe IP Identification for WebSockets**: The WebSocket connection limiter uses `x-forwarded-for` but does not validate the chain, using only the first IP.                                  | **Low Risk**: A sophisticated attacker could potentially spoof their IP to bypass the connection limit if the reverse proxy configuration is compromised or misconfigured. | When using `x-forwarded-for`, iterate the list of IPs from right-to-left, checking against a list of trusted proxy IPs to find the first non-proxy IP address. |

## Refactoring Targets (Legacy Patterns)

The most critical piece of technical debt is the handling of Spotify token delivery.

- **File**: `server.ts`
- **Legacy Pattern**: **Callback Hell / Timing-Based Logic**. The code intercepts a POST request and uses nested `setTimeout` calls to "wait" for the token to be processed. This is extremely fragile and non-deterministic. It will fail if file I/O is slow or if the event timing changes, leading to silent failures where the service continues with a stale token.
- **Modern Approach**: **Event-Driven Architecture**. The Next.js API route that receives the token should directly notify the `spotifyService` that a new token is available. This can be achieved by making the service instance accessible to the API route (e.g., via a global singleton or a shared module) and calling a method like `spotifyService.updateTokens(newTokens)`. This is a reliable, instantaneous, and direct way to handle the event.

**Code Snippet (Problem):**

```typescript
// server.ts - Brittle, timing-based logic
expressApp.use(async (req: Request, res: Response) => {
  if (
    req.method === 'POST' &&
    req.url &&
    req.url.includes(API_INTERNAL_TOKEN_DELIVERY)
  ) {
    // Unreliable race condition
    setTimeout(async () => {
      spotifyService.setRefreshToken('signal') // Re-reads from disk
      // Another race condition
      setTimeout(async () => {
        await spotifyService.forcePollAndBroadcast()
      }, 1500)
    }, 1000)
  }
  return nextRequestHandler(req, res)
})
```

**Code Snippet (Recommended Fix):**

```typescript
// /app/api/internal/token-delivery/route.ts - Example Next.js route
import { spotifyService } from '@/lib/services' // Assume service is exposed via a module

export async function POST(request: Request) {
  const newTokens = await request.json()

  // Direct, event-driven, and reliable
  await spotifyService.updateTokens(newTokens)

  return new Response('Tokens delivered successfully', { status: 200 })
}
```

## Dependency Cleanup

A full `depcheck` run is recommended, but based on the `package.json` review, the following are likely candidates for removal or review:

- **`cross-env`**: The `dev` script uses `cross-env`, but also uses `node --env-file`. Node's built-in environment file support may make this package redundant. Evaluate if it's still needed for other scripts or CI environments.
- **`pino-pretty`**: This is listed as a `devDependency` but is piped directly from the `dev` script. This is correct, but ensure it is not accidentally used in any production startup scripts.
