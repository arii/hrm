# Copilot Instructions for the HRM Dashboard Project

This document provides context and rules for AI assistants to ensure consistency and adherence to project standards. These instructions are designed to **reduce "AI slop"** by enforcing technical-first constraints specific to this project's architecture.

## Tech Stack & Core Concepts

- **Framework**: Next.js with a custom, stateful Express server (`server.ts`).
- **Language**: TypeScript
- **UI**: Material-UI (MUI)
- **State Management**: Server-side for global state, pushed to clients via WebSockets. Client-side state is ephemeral and managed with React Context and hooks.
- **Real-time**: A WebSocket server (`ws` package) manages real-time communication.
- **Deployment**: The application is stateful and deployed on a traditional Node.js host using PM2. It is **not** compatible with serverless platforms like Vercel.

## Critical Architectural Constraints

### The Stateful Server Architecture

This project uses a **custom Express server** (`server.ts`) as the entry point, NOT Next.js API routes for persistence or state management.

**NEVER suggest:**

- Storing state in Next.js API routes (they are stateless in this architecture)
- Using serverless-style patterns (e.g., edge functions, middleware that assumes stateless execution)
- Client-side state management libraries for server-managed state (e.g., `react-query`, `swr` for data that should be pushed via WebSocket)

**ALWAYS recognize:**

- The server maintains a singleton state via services in `lib/services.ts`
- State is broadcast to clients via WebSocket messages defined in `types/websocket.ts`
- Client components receive state updates through WebSocket subscriptions, not HTTP polling

### The Single Source of Truth Principle

The server is the **single source of truth** for all shared application state (HRM data, timer state, Spotify playback).

**NEVER suggest:**

- Client-side fetching patterns for state that should be pushed (e.g., `useEffect` with `fetch` for timer state)
- Redundant HTTP endpoints for data already available via WebSocket
- Client-side state synchronization logic (the server handles this)

**ALWAYS suggest:**

- Sending commands from client to server via WebSocket messages
- Receiving state updates from server via typed WebSocket message handlers
- Using the existing WebSocket message types in `types/websocket.ts`

## Rules & Guidelines

### 1. Package Manager: ALWAYS use `pnpm`

- **Correct**: `pnpm install`, `pnpm add <package>`, `pnpm run <script>`, `pnpm exec <command>`
- **Incorrect**: `npm ...`, `npx ...`, `yarn ...`
- **Reasoning**: The project is standardized on `pnpm` to ensure deterministic dependency installation via `pnpm-lock.yaml`. Using `npm` or `yarn` will cause lockfile conflicts and break the build.
- **Validation**: Before suggesting any package installation, verify the command uses `pnpm`. Check that scripts align with those in `package.json`.

### 2. Strict Type Safety: NO `any` Types

This project enforces `@typescript-eslint/no-explicit-any` as an **error**. Generic type suggestions are considered slop.

**NEVER suggest:**

- Using `any` type
- Type assertions to `any` (e.g., `as any`)
- Disabling the `no-explicit-any` rule

**ALWAYS use:**

- `unknown` with type narrowing (type guards, `typeof` checks)
- **Discriminated Unions** for complex types (especially WebSocket messages)
- The `_test_` property pattern for accessing private members in tests (instead of `as any`)

**Examples:**

#### Discriminated Union for WebSocket Messages

```typescript
// Good: Type-safe message handling
export type ServerMessage =
  | { type: 'INITIAL_STATE'; payload: InitialStateSnapshotPayload }
  | { type: 'HRM_UPDATE'; payload: HrmData[] }
  | { type: 'TIMER_UPDATE'; payload: TimerData }
  | { type: 'SPOTIFY_UPDATE'; payload: SpotifyData }

function handleMessage(message: ServerMessage) {
  switch (message.type) {
    case 'HRM_UPDATE':
      // TypeScript knows message.payload is HrmData[]
      updateHrmDisplay(message.payload)
      break
    // ...
  }
}
```

#### Type Narrowing with `unknown`

```typescript
// Good: Type narrowing
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    const value = (data as { value: number }).value
    // ...
  }
}

// Bad: Using any
function processData(data: any) {
  const value = data.value // NO!
}
```

#### Testing Private Members

```typescript
// Good: _test_ property pattern
class SpotifyService {
  private pollInterval: NodeJS.Timeout | null = null

  public _test_ =
    process.env.NODE_ENV === 'test'
      ? {
          getPollInterval: () => this.pollInterval,
          setPollInterval: (interval: NodeJS.Timeout | null) => {
            this.pollInterval = interval
          },
        }
      : undefined
}

// In tests
if (spotifyService._test_) {
  const interval = spotifyService._test_.getPollInterval()
}

// Bad: Casting to any
const interval = (spotifyService as any).pollInterval // NO!
```

### 3. Linting: Assume Pre-commit Hooks Handle It

- **Rule**: Do not suggest adding manual linting steps to developer workflows or CI scripts.
- **Context**: The repository is configured with Husky and lint-staged. Code is automatically formatted with Prettier and linted with ESLint before every commit.
- **When to suggest manual linting**: Only suggest `pnpm run lint` or `pnpm run lint:fix` if the goal is to check the entire project, not just staged files.

### 4. Deployment Context

- **Branch**: Production deployment always targets the `leader` branch.
- **Mechanism**: Deployment is handled by a `deploy.sh` script on the production host. This script pulls the latest `leader` branch and reloads the application using `pm2 reload`.
- **Environment**: The production server requires a `.env.production` file.
- **Scripts**: All deployment scripts must align with `package.json` scripts and the `ecosystem.config.cjs` PM2 configuration.

### 5. Component-Driven Precision with MUI

All UI components must use Material-UI (MUI) and adhere to the project's theme.

**NEVER suggest:**

- Custom CSS modules or styled-components (use MUI's styling system)
- Inline styles without MUI's `sx` prop
- Generic HTML elements where MUI components exist (e.g., `<button>` instead of `<Button>`)

**ALWAYS use:**

- `@/*` path aliases for all imports from the root directory
- MUI components from `@mui/material`
- The project theme defined in `theme/theme.ts` (access via `useTheme()`)
- MUI's `sx` prop for component-specific styling
- Custom theme colors via `theme.palette.custom.*` (e.g., `theme.palette.custom.work`, `theme.palette.custom.rest`)

**Examples:**

```typescript
// Good: MUI with theme and path alias
import { Button, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { SomeComponent } from '@/components/SomeComponent'

function MyComponent() {
  const theme = useTheme()

  return (
    <Box sx={{ backgroundColor: theme.palette.custom.work }}>
      <Button variant="contained" color="primary">
        Click Me
      </Button>
    </Box>
  )
}

// Bad: Custom styles and relative imports
import './MyComponent.css' // NO!
import { SomeComponent } from '../../components/SomeComponent' // NO!

function MyComponent() {
  return (
    <div className="my-box"> {/* Use MUI Box */}
      <button style={{ color: 'red' }}>Click Me</button> {/* Use MUI Button */}
    </div>
  )
}
```

### 6. Structured Reporting: Use GitHub Issue Templates

When identifying bugs, feature requests, or refactoring needs, structure output according to the templates in `.github/ISSUE_TEMPLATE/`.

**Available Templates:**

- `bug_report.md` - For bug reports
- `feature_request.md` - For feature requests
- `refactor_request.md` - For refactoring suggestions

**NEVER:**

- Provide conversational fluff or generic observations
- Suggest changes without structured context

**ALWAYS:**

- Reference specific files, line numbers, and code snippets
- Include reproduction steps for bugs
- Provide clear expected vs. actual behavior
- Link to relevant architecture sections in this document

**Example Bug Report Format:**

```markdown
## Bug Description

WebSocket connection fails to reconnect after server restart.

## Steps to Reproduce

1. Start the server with `pnpm run dev`
2. Connect a client to the WebSocket
3. Restart the server
4. Client does not reconnect automatically

## Expected Behavior

Client should attempt exponential backoff reconnection as defined in `lib/websocket.ts`.

## Actual Behavior

Client remains disconnected and shows "Connection lost" permanently.

## Architecture Context

Violates **Single Source of Truth Principle** (section: Critical Architectural Constraints) because client cannot receive server state updates without connection.

## Files Involved

- `lib/websocket.ts:45-67` - Client reconnection logic
- `hooks/useWebSocket.ts:23` - WebSocket hook initialization
```

### 7. Code Conciseness & Redundancy Prevention

This project prioritizes a lean and maintainable codebase. AI assistants should actively suggest ways to reduce total lines of code (LOC).

**NEVER suggest:**

- Re-implementing functions, hooks, or constants that already exist in the codebase.
- Adding verbose, obvious, or redundant code/comments.
- Overly complex logic for simple requirements.

**ALWAYS suggest:**

- Refactoring to reuse existing logic.
- Solutions that reduce the net LOC (added vs. removed).
- Simplifying complex functions into smaller, more manageable units.
- Removing boilerplate or over-specified types that can be inferred.

## Quick Reference: Anti-Patterns to Avoid

| ❌ AI Slop                                              | ✅ Correct Approach                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "You could use Next.js API routes to store timer state" | "Timer state is managed in `server.ts` via `TimerService` and broadcast via WebSocket" |
| "Install with `npm install <package>`"                  | "Install with `pnpm add <package>`"                                                    |
| "Use `any` type here for simplicity"                    | "Use discriminated union or `unknown` with type narrowing"                             |
| "Add a `react-query` hook to fetch timer state"         | "Subscribe to `TIMER_UPDATE` WebSocket messages via `useWebSocket` hook"               |
| "Use inline styles"                                     | "Use MUI's `sx` prop with theme colors from `theme/theme.ts`"                          |
| "Import with `../../../components/`"                    | "Import with `@/components/`"                                                          |
| "Add `eslint-disable no-explicit-any`"                  | "Refactor to use proper types"                                                         |
| "Cast to `any` to access private property"              | "Use `_test_` property pattern for testing"                                            |
| "Re-implementing `formatDate` helper"                   | "Reuse existing `formatDate` from `utils/date.ts`"                                     |
| "Adding verbose comments to obvious code"               | "Keep code self-documenting and remove redundant comments"                              |
| "Increasing LOC for a simple change"                    | "Look for more concise alternatives to reduce total LOC"                               |
