<SYSTEM>
You are an AI programming assistant that is specialized in applying code changes to an existing document.
Follow Microsoft content policies.
Avoid content that violates copyrights.
If you are asked to generate content that is harmful, hateful, racist, sexist, lewd, violent, or completely irrelevant to software engineering, only respond with "Sorry, I can't assist with that."
Keep your answers short and impersonal.
The user has a code block that represents a suggestion for a code change and a instructions file opened in a code editor.
Rewrite the existing document to fully incorporate the code changes in the provided code block.
For the response, always follow these instructions:
1. Analyse the code block and the existing document to decide if the code block should replace existing code or should be inserted.
2. If necessary, break up the code block in multiple parts and insert each part at the appropriate location.
3. Preserve whitespace and newlines right after the parts of the file that you modify.
4. The final result must be syntactically valid, properly formatted, and correctly indented. It should not contain any ...existing code... comments.
5. Finally, provide the fully rewritten file. You must output the complete file.
</SYSTEM>

I have the following code open in the editor, starting from line 1 to line 614.

`````instructions
````instructions
Here is the plan converted to markdown formatting for you to copy and paste.

---

# Copilot Instructions for the HRM Project

**Last Updated:** November 2025

Welcome to the HRM project! This document provides essential guidelines for AI coding agents to be productive in this stateful codebase.

## Project Status: ✅ Fully Operational

All core features are implemented and working:
- Custom Express + Next.js server with WebSocket
- Tabata Timer with audio feedback
- Spotify integration with OAuth and auto-refresh
- Heart rate monitoring (Bluetooth + Mock)
- Visual regression tests with Playwright
- Automated verification tools

**Key Documentation:**
- [README.md](../README.md) - Setup and usage
- [FRONTEND_IMPROVEMENT_PLAN.md](../FRONTEND_IMPROVEMENT_PLAN.md) - Actionable tasks for improving the interface
- [running_notes.md.backup](../running_notes.md.backup) - Current status and quick reference snapshot
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - Server and integration issues
- [docs/automation-plan.md](../docs/automation-plan.md) - Chrome DevTools MCP automation workflow

## Project Architecture: Stateful Next.js with Custom Server

This is **NOT** a standard serverless Next.js app.

**Critical Components:**

1. **`server.ts`** - The **true entry point**:
  # Copilot Instructions for the HRM Project

  **Last Updated:** November 2025

  Welcome to the HRM project. This guide keeps AI coding agents aligned with the stateful server architecture, real-time data flow, and preferred tooling for this repository.

  ## Project Status: ✅ Fully Operational

  All core features are implemented and working:
  - Custom Express + Next.js server with WebSocket
  - Tabata Timer with audio feedback
  - Spotify integration with OAuth and auto-refresh
  - Heart rate monitoring (Bluetooth + Mock)
  - Visual regression tests with Playwright
  - Automated verification tools

  **Key Documentation:**
  - [README.md](../README.md) – Setup and usage
  - [FRONTEND_IMPROVEMENT_PLAN.md](../FRONTEND_IMPROVEMENT_PLAN.md) – UI polish backlog
  - [running_notes.md.backup](../running_notes.md.backup) – Current status snapshot
  - [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) – Server and integration issues
  - [docs/automation-plan.md](../docs/automation-plan.md) – Chrome DevTools MCP automation workflow

  ## Project Architecture: Stateful Next.js with Custom Server

  This is **not** a serverless Next.js deployment. The custom Node entry point keeps global state in memory and coordinates background services.

  **Critical Components:**

  1. **`server.ts`** – True entry point
    - Runs Express server
    - Hosts the Next.js application
    - Manages WebSocket server on `/ws`
    - Initializes background services (Tabata Timer, Spotify Polling)
  2. **WebSocket (`utils/socketManager.ts`)** – Real-time communications hub
    - Broadcasts HR data, timer state, music status
    - **Do not** use Next.js API routes for live state
  3. **Services (server-side only)**
    - `services/tabataTimer.ts` – Timer state machine
    - `services/spotifyPolling.ts` – Spotify API polling (3s interval)
    - `services/spotifyTokenManager.ts` – Token refresh (55 min interval)
  4. **Authentication**
    - NextAuth.js for Spotify OAuth
    - Tokens persist to `logs/spotify_tokens.json`
    - Auto-load on server restart
  5. **UI Components**
    - Material-UI (MUI) only – no Tailwind or CSS Modules
    - Client pages consume `hooks/useWebSocket.ts` for real-time data

  ## Key Files and Their Roles

  **Server Entry Point:**
  - `server.ts` – Express + Next.js + WebSocket + services bootstrap

  **Client Pages:**
  - `app/page.tsx` – Main dashboard (HR/timer/music)
  - `app/client/control/page.tsx` + `ControlPanel.tsx` – Timer and Spotify controls
  - `app/client/connect/page.tsx` – Web Bluetooth HRM connector
  - `app/client/mock/page.tsx` – Mock HRM data sender

  **API Routes:**
  - `app/api/auth/[...nextauth]/route.ts` – Spotify OAuth (NextAuth)
  - `app/api/internal/token-delivery/route.ts` – Persists OAuth tokens to disk
  - `app/api/debug/*` – Auth-check, token-status, and session diagnostics

  **Server-Side Services:**
  - `services/tabataTimer.ts` – Timer state machine and audio events
  - `services/spotifyPolling.ts` – Spotify polling and playback control
  - `services/spotifyTokenManager.ts` – Token refresh lifecycle

  **Client-Side Hooks:**
  - `hooks/useWebSocket.ts` – WebSocket connection + message handling
  - `hooks/useBluetoothHRM.ts` – Web Bluetooth HRM connection
  - `hooks/useTabataSounds.ts` – Audio feedback via Web Audio API

  **Dashboard Components:**
  - `components/TimerDisplay.tsx` – Timer visualization
  - `components/HrmTiles.tsx` – HR tile grid wrapper with skeletons
  - `components/SpotifyDisplay.tsx` – Fixed footer playback + volume sync

  **Utilities:**
  - `utils/socketManager.ts` – Server-side WebSocket router
  - `utils/visualization.ts` – HR zone colors and calculations

  **Shared Types:**
  - `types/index.ts` – Cross-cutting UI props and timer enums

  **Configuration:**
  - `.env.local` – Spotify and NextAuth secrets
  - `tsconfig.json` – TypeScript configuration (CommonJS for ts-node)
  - `ecosystem.config.js` – PM2 production configuration

  ## Developer Workflows

  ### Running the Development Server

  **Critical:** always use the custom entry point. Running `next dev` alone skips the WebSocket server and background services.

  ```bash
  # Next.js + WebSocket + services
  npm run dev
  ```

  Notes:
  - `server.ts` respects the `HOST` env var (defaults to `127.0.0.1`). Use `HOST=0.0.0.0` when running inside containers.
  - Stopping the dev server should also terminate background services; if not, run `npm run kill-all`.
   - Client pages use `hooks/useWebSocket.ts` for real-time data

## Key Files and Their Roles

**Server Entry Point:**
- `server.ts` - Express + Next.js + WebSocket + Services initialization

**Client Pages:**
- `app/page.tsx` - Main dashboard (passive viewer, displays HR/timer/music)
- `app/client/control/page.tsx` / `ControlPanel.tsx` - Control panel container (timer + Spotify commands)
- `app/client/connect/page.tsx` - Web Bluetooth HRM connector
- `app/client/mock/page.tsx` - Mock HRM data sender for testing

**API Routes:**
- `app/api/auth/[...nextauth]/route.ts` - Spotify OAuth (NextAuth)
- `app/api/internal/token-delivery/route.ts` - Saves OAuth tokens to file
- `app/api/debug/*` - Debug endpoints (auth-check, token-status, session)

**Server-Side Services (run by server.ts):**
- `services/tabataTimer.ts` - Timer state machine
- `services/spotifyPolling.ts` - Spotify API polling and token loading
- `services/spotifyTokenManager.ts` - Token refresh management

**Client-Side Hooks:**
- `hooks/useWebSocket.ts` - WebSocket connection and message handling
- `hooks/useBluetoothHRM.ts` - Web Bluetooth HRM connection
- `hooks/useTabataSounds.ts` - Audio feedback (Web Audio API)

**Dashboard Components:**
- `components/TimerDisplay.tsx` - Timer visualization
- `components/HrmTiles.tsx` - HR tile grid wrapper with filtering/skeletons
- `components/SpotifyDisplay.tsx` - Fixed footer playback controls and volume sync

**Utilities:**
- `utils/socketManager.ts` - WebSocket message router (server-side)
- `utils/visualization.ts` - HR zone colors and calculations

**Shared Types:**
- `types/index.ts` - Shared UI prop types and enums for dashboard/control components

**Configuration:**
- `.env.local` - Secrets (Spotify, NextAuth)
- `tsconfig.json` - TypeScript (module: CommonJS for ts-node)
- `ecosystem.config.js` - PM2 production configuration

## Developer Workflows

### Running the Development Server

**CRITICAL:** This repository uses a custom Node entry (`server.ts`) that runs Next.js plus the persistent WebSocket server and background services. Do NOT use `next dev` alone if you need real-time behavior.

Preferred commands (defined in `package.json`):

```bash
# Run the development server (Next.js + WebSocket + services)
npm run dev

# Build for production
npm run build

# Start production server with PM2
npm run start
```

Notes:

- `server.ts` reads the `HOST` env var (falls back to `127.0.0.1`). Use `HOST=0.0.0.0` to bind all interfaces in containers.
- If you only run `next dev`, background services (Tabata timer, Spotify polling) and the WS manager will not be started.

### Building the Application

To create a production build, you must first build Next.js, then run the server.

```bash
# 1. Build the Next.js app
npm run build

# 2. Run the custom server in production mode (PM2)
npm run start
```

### Linting & Formatting

Ensure code quality and consistency before committing.

```bash
npm run lint
```

### Visual Regression Testing with Playwright

The project uses Playwright for screenshot-based visual regression testing to ensure UI consistency.

```bash
# Run visual regression tests (headless)
  }`,

# Run tests with browser UI for debugging
npm run test:visual:ui

# Run tests in headed mode (see browser)
  args: [{ uid: "4_1" }] // Replace with actual UID from snapshot

# Debug tests step-by-step
npm run test:visual:debug

# Update snapshots after intentional UI changes
npm run test:visual:update

# View test results report
npm run test:visual:report

# Install Playwright browsers (run once)
});
```

**Important Notes:**
- Always run `npm run test:visual` before committing UI changes
- Use `npm run test:visual:update` only after verifying changes are intentional
- Tests are located in `tests/playwright/visual-regression.spec.ts`
- Screenshots are stored in `tests/playwright/screenshots/`

### VS Code: Run & Debug (recommended)

This workspace includes `.vscode/launch.json` and `.vscode/tasks.json` to make running and debugging easier:

- Use the `Launch HRM Server` configuration to start the server with `ts-node` and attach the debugger.
- Use the `Open Browser to HRM` configuration to open a browser to `http://127.0.0.1:3000` after starting the server.

How to use from VS Code:

1. Open the Run panel (Ctrl+Shift+D).
2. Select `Launch HRM Server` and press the green ▶️. The integrated terminal will start the server and the debugger will attach.
3. Optionally run `Open Browser to HRM` to open the app in the browser after the server is running.

If you prefer command-line only, `npm run dev` is the simplest way to run the server.

## Project-Specific Conventions

1.  **State Management**: All global application state (Timer, HR, Music) is **owned by the server** (in `services/`). Clients are "dumb" and just send/receive WebSocket messages.
2.  **UI Components**: Use **MUI** (`@mui/material`) for all components.
3.  **Client-Server Communication**:
  - **To Send/Receive Real-time Data**: Use the `useWebSocket.ts` hook.
    - **For Authentication**: Use the NextAuth flow (`/api/auth/...`).
    - **DO NOT** add new functionality to Next.js API Routes if it involves real-time state.
4.  **TypeScript**: Use TypeScript for all new files and ensure type safety.

## External Dependencies

- **Next.js**: Framework.
- **React**: UI Library.
- **MUI**: Component Library.
- **Express**: Custom server framework.
- **ws**: WebSocket server library.
- **NextAuth.js**: For Spotify OAuth.
- **node-fetch**: For server-side Spotify polling.

## Deployment

**DO NOT DEPLOY ON VERCEL.**

This application is **stateful** and **cannot** be deployed on a serverless platform like Vercel. It must be deployed as a long-running Node.js process.

1.  **Build:** Run `npm run build` on the server.
2.  **Process Manager:** Use **PM2** to run the server persistently.

- `pm2 start ecosystem.config.js --env production --name "hrm-server"`

3.  **Reverse Proxy:** Use **Apache** or **Nginx** as a reverse proxy to handle incoming traffic, manage SSL, and correctly proxy WebSocket (`ws://`) connections to the Node server.

## Notes for AI Agents

- **Always respect the `server.ts` architecture.**
- When adding new controls (e.g., "Skip Song"), update the relevant component in `app/client/control/components/` (`TimerControls.tsx` or `SpotifyControls.tsx`), send a new WebSocket message type, and handle that message in `utils/socketManager.ts` to trigger `services/spotifyPolling.ts`.
- When adding new visuals (e.g., "HR Chart"), add the component to `app/page.tsx` and have it read data from the `useWebSocket` hook.
- Run `npm run lint` before finalizing code.

## Recent dev-environment updates (FYI)

- Dev scripts now use `ts-node` to run `server.ts` in development. Preferred dev command: `npm run dev`.
- Production start is managed via `ecosystem.config.js` and `npm run start` which invokes PM2 in the production env. Logs are written to `./logs/`.
- Workspace includes `.vscode/launch.json` and `.vscode/tasks.json` to start the dev script and attach the debugger.

# Troubleshooting Development Server Setup

1. Get logs from running server:
   `timeout 10 pm2 logs `
   Note you should always use timeout so you don't hang indefinitely.

2. Use mcp tools to interact with the running server

## Chrome DevTools MCP (recommended developer tooling)

If you want to allow coding agents (or local scripts) to control a Chrome instance for debugging, performance traces, and DOM/console inspection, we recommend using the official Chrome DevTools MCP server in isolated mode.

Quick facts

- Requires Node.js v20.19+ and a local Chrome installation (stable or other channel).
- Runs via npx; it will start Chrome automatically unless you supply `--browser-url` to connect to an existing instance.

Recommended npm scripts (already included in `package.json`):

```bash
# Start an isolated MCP server (temporary user-data-dir)


# Start headless (useful for CI traces)
console.log(bgColor); // "rgb(33, 150, 243)" (blue) or other zone color
```

VS Code task

- Use the included `.vscode/tasks.json` tasks to start the MCP server from the Run panel. Tasks are named:
  - `Start Chrome DevTools MCP (isolated)`
  - `Start Chrome DevTools MCP (headless)`

How to use (examples)

- Start the MCP server in isolated mode (recommended to avoid profile conflicts):

```bash
npm run mcp:chrome-devtools
```

- If you prefer to connect to a Chrome instance you start yourself (useful in sandboxes/containers):

Start Chrome with remote debugging enabled (example Linux):

```bash
/usr/bin/google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-profile-stable
```

Then configure the MCP client to use the browser URL:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browser-url=http://127.0.0.1:9222"
      ]
    }
  }
}
```

Notes & troubleshooting

- If you hit `The browser is already running ... Use --isolated` start with `--isolated` to create a temporary user-data directory and avoid lock conflicts.
- If the MCP server cannot start Chrome in your environment (container/sandbox), use `--browser-url` to connect to a manually-started Chrome that has `--remote-debugging-port` enabled.
- For verbose logs, set the `DEBUG` env var to `*` and pass `--logFile /path/to/log` to the MCP server.
- Security: opening remote debugging exposes control of the browser. Avoid using it while browsing sensitive sites.

## This short guide should make it easier for developers to start an MCP server locally and for AI tooling to safely interact with the app during debugging and performance investigations.

## MCP Chrome DevTools: Successful Patterns & Working Configurations

**Overview**: The Chrome DevTools MCP (Model Context Protocol) server allows AI agents to remotely control a Chrome browser for automated testing, visual regression, DOM inspection, console monitoring, and real-time protocol analysis. This section documents the working setup and patterns validated in Nov 2025.

### Launch Configuration (Working Setup)

⚠️ **IMPORTANT**: All long-running commands (npm dev, Chrome, MCP) **MUST run in the background** to prevent hanging. Always use `&` and redirect output to files.

```bash
# Step 1: Start the unified dev server IN BACKGROUND
# CRITICAL: Must run in background to avoid hanging
npm run dev:clean > /tmp/dev.log 2>&1 &
sleep 5  # Wait for server to start

# Step 2: Clean up any stale processes
pkill -9 chrome chrome-devtools-mcp 2>/dev/null || true
sleep 1

# Step 3: Launch Chrome with remote debugging enabled IN BACKGROUND
# CRITICAL FLAGS: --no-sandbox --disable-web-security are REQUIRED for WebSocket support
/usr/bin/google-chrome \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --disable-web-security \
  --user-data-dir=~/.config/chrome-debug-profile > /tmp/chrome.log 2>&1 &
sleep 2  # Wait for Chrome to start

# Step 4: Verify server and Chrome are running BEFORE starting MCP
lsof -i :3000 | grep LISTEN || echo "ERROR: Dev server not listening on :3000"
lsof -i :9222 | grep LISTEN || echo "ERROR: Chrome DevTools not listening on :9222"

# Step 5: Start the MCP server IN BACKGROUND
# CRITICAL: Must run in background to avoid hanging
npm run mcp:chrome-devtools > /tmp/mcp.log 2>&1 &
sleep 3  # Wait for MCP to start

# Step 6: (Optional) Configure port forwarding via chrome://inspect
# In Chrome DevTools: Devices > Port forwarding > Add rule: localhost:3000 -> localhost:3000
```

**Monitoring and Debugging:**

```bash
# Check if servers are running (safe - won't hang)
```
lsof -i :9222 | head -3  # Chrome debugging
ps aux | grep -E "npm run mcp|chrome" | grep -v grep  # Process list

# View logs with TIMEOUT to prevent indefinite blocking
# ALWAYS use timeout when reading logs - don't use "pm2 logs" without timeout!

#### 6. Test Responsive Design


# Alternative: Use PM2 logs with timeout
```typescript

# Kill all if needed
pkill -9 node chrome chrome-devtools-mcp 2>/dev/null
```

### Why These Flags Matter

- `--remote-debugging-port=9222`: Exposes Chrome's debugging protocol; required for MCP to connect
- `--no-sandbox`: Disables Chrome's OS-level sandbox (needed for WebSocket protocol in remote context)
- `--disable-web-security`: Bypasses CORS/CSP (needed for WebSocket protocol upgrade in remote debugging context)
- `--user-data-dir=~/.config/chrome-debug-profile`: Persistent profile across sessions; preserves cookies, cache, and debugging state
// Navigate to control panel
await mcp.navigate_page({
  type: "url",
  url: "http://127.0.0.1:3000/client/control"
});

// Set mobile viewport (375x667 = iPhone SE)
await mcp.resize_page({ width: 375, height: 667 });

// Take mobile screenshot
await mcp.take_screenshot({
  fullPage: true,
  filePath: "/tmp/control-mobile.png"
});

// Get snapshot to verify button visibility
const snapshot = await mcp.take_snapshot();
const visibleButtons = snapshot.filter(el =>
  el.role === "button" && el.visible
);
console.log(`${visibleButtons.length} buttons visible on mobile`);
```

#### 7. Measure WebSocket Round-Trip Latency

```typescript
// Navigate to mock page
await mcp.navigate_page({
  type: "url",
  url: "http://127.0.0.1:3000/client/mock"
});

// Fill BPM and start streaming
await mcp.fill({ uid: "3_12", value: "150" });
await mcp.click({ uid: "3_19" }); // START button

// Now navigate to dashboard (in a separate browser tab or new page)
// For MCP, we'd typically use multiple page contexts here

// Alternative: evaluate latency directly via browser timing
const latency = await mcp.evaluate_script({
  function: `() => {
    const startTime = performance.now();
    // Simulate HR data packet
    const msg = { type: "HRM_INPUT", data: { value: 150 } };
    // In real scenario, measure time from send to STATE_UPDATE receipt
    // For this example, return 0 as placeholder
    return performance.now() - startTime;
  }`
});

console.log(`Round-trip latency: ${latency}ms (target: <120ms)`);
```

### Troubleshooting MCP Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `The browser is already running ... Use --isolated` | Chrome/MCP conflict from prior run | Kill processes: `pkill -9 chrome chrome-devtools-mcp; sleep 1` then restart |
| WebSocket connection timeout (>3s) | `--no-sandbox` or `--disable-web-security` missing | Ensure Chrome launched with BOTH flags: `--no-sandbox --disable-web-security` |
| "Cannot connect to DevTools on port 9222" | Chrome not listening on correct port | Verify Chrome startup: `lsof -i :9222` or check for Chrome process with `ps aux \| grep chrome` |
| Stale tabs/pages not closing | MCP keeps multiple page contexts open | Use `mcp_chrome-devtoo_close_page()` to clean up: `close_page({ pageIdx: 1 })` |
| Port forwarding not working | `chrome://inspect` not configured | Manually configure: Chrome DevTools > Devices > Port forwarding > Add rule `localhost:3000 -> localhost:3000` |

### Best Practices

1. **Always take a snapshot before targeting elements**: UIDs change on reload; call `take_snapshot()` and extract UIDs dynamically.
2. **Use explicit waits, not sleeps**: `wait_for({ text: "...", timeout: 5000 })` is more reliable than `await sleep(1000)`.
3. **Clean up stale processes before starting**: `pkill -9 chrome chrome-devtools-mcp 2>/dev/null || true` prevents conflicts.
4. **Keep the persistent profile**: `--user-data-dir=~/.config/chrome-debug-profile` preserves session state across MCP reloads.
5. **Test WebSocket once, then use HTTP polling**: If real-time updates are critical and WS closes early, fall back to periodic HTTP requests.
6. **Document UIDs in comments**: When targeting form fields or buttons, note their purpose: `uid: "3_12" // BPM input field`.

---

## Dev & Debug Checklist (updated)

1. Start development server (PM2 + ts-node) **IN BACKGROUND**
   - Preferred: `npm run dev:clean > /tmp/dev.log 2>&1 &` (background with log redirection)
   - VS Code: use `Launch HRM Server (pm2)` from the Run panel (automatically runs in background).
   - View logs: `timeout 15 tail -100 /tmp/dev.log` (always use timeout to prevent hanging!)
   - Alternative: `timeout 10 pm2 logs 2>&1 | head -50` (limits output to prevent hanging)

2. Important notes
   - The canonical server entry is `server.ts`. Do not rely on `next dev` if you need the WebSocket server or background services.
   - WebSocket routing and broadcast are implemented in `utils/socketManager.ts`; timer state originates in `services/tabataTimer.ts`.
   - Client connection hook: `hooks/useWebSocket.ts`.
   - If you see `TypeError: Unknown file extension ".ts"` in `server-error.log`, confirm the server still reports "Ready on http://127.0.0.1:3000" in `server-out.log`. This error has been observed as non-fatal during startup.

3. Testing & visual regression **IN BACKGROUND**
   - Add Playwright visual tests to validate layout and color zones.
   - When debugging visual mismatches, use Chrome DevTools MCP (run in background):
     - Start MCP: `npm run mcp:chrome-devtools > /tmp/mcp.log 2>&1 &`
     - Or headless: `npm run mcp:chrome-devtools:headless > /tmp/mcp.log 2>&1 &`
     - Check startup: `timeout 5 tail -50 /tmp/mcp.log`
   - Use DevTools to capture screenshots and trace WebSocket frames when validating latency.

4. MCP setup examples **CRITICAL: Run all in background**
   - Dev server: `npm run dev:clean > /tmp/dev.log 2>&1 &` then `sleep 5`
   - Chrome: `/usr/bin/google-chrome --remote-debugging-port=9222 --no-sandbox --disable-web-security --user-data-dir=~/.config/chrome-debug-profile > /tmp/chrome.log 2>&1 &` then `sleep 2`
   - MCP: `npm run mcp:chrome-devtools > /tmp/mcp.log 2>&1 &` then `sleep 3`
   - Verify: `lsof -i :3000` (dev) and `lsof -i :9222` (Chrome) should show LISTEN
   - View logs with timeout: `timeout 10 tail -50 /tmp/mcp.log`

5. Adding new real-time behaviors
  - To add a new timer or music control:
    - Add command UI in `app/client/control/components/TimerControls.tsx` or `SpotifyControls.tsx` (rendered by `ControlPanel.tsx`).
     - Send a `ClientCommandMessage` via `hooks/useWebSocket.ts`.
     - Handle the command in `utils/socketManager.ts` and delegate to the correct service.

6. Replication & QA (summary)
   - Priority: restore Tabata beeps (server sends `soundToPlay`, client plays).
   - Visual parity: match big timer, percent tiles, and workout columns.
   - Use MCP with background Chrome for advanced debugging.

**Key reminder**: All long-running processes (dev, Chrome, MCP) must run **IN BACKGROUND** with `&` and output redirected to files. **ALWAYS use `timeout`** when reading logs to prevent indefinite blocking.
`````

```

```
