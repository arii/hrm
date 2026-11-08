# ADR: Keep the Unified Express + Next.js + WebSocket Server

## Status

Accepted

## Context

An architecture audit (`TODO.md`) recommended extracting WebSocket handling
into a standalone Express + `ws` service, on the grounds that Next.js API
routes are serverless and drop persistent connections.

That premise does not apply to this repo: `server.ts` is a custom unified
server (Express + Next.js + `ws`) run under PM2 (`ecosystem.config.cjs`,
`deploy/ecosystem.config.cjs`). Telemetry never traverses serverless
routes. Splitting the server would also break the in-process singletons
the broadcast path relies on (`TabataTimer`, `HrmSessionManager`, Spotify
polling/service in `utils/socketManager.ts`) — a split would require
introducing Redis or an IPC layer purely to re-share that state, plus a
second deployable and a two-process local DX.

Meanwhile the incremental path is working: per-slice WS contexts (#9803),
change-only broadcasts (#9802), ping/pong watchdog with stale-socket
termination, and 100ms throttling of high-frequency dispatches.

## Decision

Keep the unified `server.ts`. Do not extract a standalone WebSocket
service. Continue paying down WebSocket performance incrementally
(backpressure only with heap evidence, bounded client buffers).

## Consequences

- No new deployable, no cross-process state sync, no DX regression.
- Server memory/CPU remain shared between HTTP and WS; acceptable at the
  current strap count and ~1–2Hz cadence.
- Revisit only on measured evidence: sustained heap/CPU pressure
  attributable to WS, a need to scale WS independently of HTTP, or team
  growth that justifies service boundaries.
