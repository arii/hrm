# Architectural Boundary & Import Guidelines

To maintain a clean, scalable, and secure codebase, HRM enforces strict architectural boundaries. These boundaries are verified via automated linting and CI gates.

## 1. Transport Boundaries

**Goal:** Isolate infrastructure-level transport logic (WebSockets, Socket.io) from the UI component tree.

### Forbidden Patterns
- Directly importing `ws` or `socket.io-client` in React components, hooks, or pages.
- Constructing `WebSocket` instances directly inside component files.

### Recommended Pattern
Move transport logic to dedicated services or context adapters:
1. **Services:** Define transport handling in `services/`.
2. **Context Adapters:** Wrap transport state in a Context Provider (e.g., `context/WebSocketContext.tsx`).
3. **Hooks:** Use clean abstraction hooks (e.g., `hooks/useWebSocket.ts`) that interact with the context rather than the library directly.

---

## 2. Client-Server Boundaries

**Goal:** Prevent server-side logic and environment-specific utilities from leaking into the browser bundle.

### Forbidden Patterns
- Importing `@/utils/logger.server` in any file under `app/`, `components/`, or `hooks/`.

### Recommended Pattern
- Use the isomorphic `@/utils/logger` for all client-side and shared code.
- Keep server-only logic strictly within `server.ts`, `middleware.ts`, or Next.js Server Actions/API Routes.

---

## 3. Enforcement

These rules are enforced via ESLint's `no-restricted-imports`. Violation of these rules will block CI.

For exceptions, use `// eslint-disable-next-line` with a clear justification and request approval from the architecture leads.
