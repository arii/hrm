# HRM (Heart Rate Monitor) Dashboard

A real-time heart rate monitoring dashboard built with Next.js, Material-UI, WebSockets, and Spotify integration. Features a custom Express server for stateful WebSocket connections, Tabata timer with audio feedback, and live HR zone visualization.

**⚠️ Important:** This project uses a custom server entry (`server.ts`) that runs Next.js, a persistent WebSocket server, and background services. The server is stateful and **cannot be deployed on serverless platforms** like Vercel.

## Current Status

**✅ Fully Operational** - All core features implemented and tested

**Active Development Focus**: UI/UX improvements, mobile optimization, and accessibility enhancements. See [UI_UX_IMPROVEMENTS.md](UI_UX_IMPROVEMENTS.md) for the roadmap.

## Features

- **Real-time Heart Rate Monitoring** - WebSocket streaming from Bluetooth HRM devices or mock client
- **Tabata Timer** - Configurable work/rest intervals with countdown beeps and phase transitions
- **HR Zone Visualization** - Large percentage tiles with color-coded zones (Grey/Blue/Green/Yellow/Red/Purple)
- **Spotify Integration** - Auto-play music on timer start, sync pause/resume, display now playing
- **Mock HRM Client** - Test interface with zone buttons, device ID, and noise simulation
- **Control Panel** - Mobile-friendly UI for timer and music controls
- **Visual Regression Tests** - Playwright screenshot-based testing

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Build the server and start the development server (runs on http://127.0.0.1:3000)
npm run dev
```

The server will start with:

- Next.js app on http://127.0.0.1:3000
- WebSocket server on ws://127.0.0.1:3000/ws
- Spotify polling service
- Tabata timer service

### Production Build

```bash
# Build TypeScript server and Next.js app
npm run build

# Start with PM2
npm run start

# View logs
npm run pm2:logs
```

## Project Structure

- **`server.ts`**: Custom Express + Next.js + WebSocket entry point
- **`app/page.tsx`**: Main dashboard (viewer)
- **`app/client/control/page.tsx`**: Timer & music controls (mobile UI)
- **`app/client/mock/page.tsx`**: Mock HRM data sender
- **`app/client/connect/page.tsx`**: Bluetooth HRM connector
- **`services/tabataTimer.ts`**: Tabata timer state machine
- **`services/spotifyPolling.ts`**: Spotify API polling service
- **`hooks/useWebSocket.ts`**: Client-side WebSocket connection hook
- **`utils/socketManager.ts`**: Server-side WebSocket message router
- **`tests/playwright/visual-regression.spec.ts`**: Screenshot-based tests

## Available Commands

### Primary Scripts

```bash
npm run dev              # Start dev server (Next.js + WebSocket + services)
npm run build            # Build for production
npm run start            # Start production server with PM2
npm run lint             # Run ESLint
npm run test:visual      # Run Playwright visual regression tests
```

### Debugging & Verification

```bash
npm run verify:spotify   # Automated Spotify integration health check
npm run pm2:logs         # View PM2 logs
npm run pm2:stop         # Stop all PM2 processes
npm run mcp:chrome-devtools  # Start Chrome DevTools MCP for debugging
```

## VS Code Integration

This workspace is pre-configured for a seamless development experience with VS Code.

- **`.vscode/settings.json`**: Enables format-on-save (Prettier) and ESLint auto-fix.
- **`.vscode/launch.json`**: Provides launch configurations to start the server and attach the debugger with one click.
- **`.vscode/tasks.json`**: Defines helper tasks for running dev scripts and the Chrome DevTools MCP.

**Recommended Extensions**:

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier - Code formatter (`esbenp.prettier-vscode`)
- Playwright Test for VSCode (`ms-playwright.playwright`)

## Environment Variables

Create a `.env.local` file in the root directory for secrets:

```env
# Spotify OAuth credentials (from developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# NextAuth.js configuration
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=your_random_secret_here
```

### Spotify Setup

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:3000/api/auth/callback/spotify` as a Redirect URI in the app settings.
3. Copy the Client ID and Client Secret into your `.env.local` file.
4. Generate a `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
5. Restart the server and run `npm run verify:spotify` to test the connection.

**For detailed setup instructions, see [SPOTIFY_TROUBLESHOOTING.md](SPOTIFY_TROUBLESHOOTING.md).**

## Troubleshooting

- **Server Startup Issues**: See [BRINGUP_TROUBLESHOOTING.md](BRINGUP_TROUBLESHOOTING.md).
- **Spotify Authentication/API Errors**: Run `npm run verify:spotify` or consult [SPOTIFY_TROUBLESHOOTING.md](SPOTIFY_TROUBLESHOOTING.md).
- **WebSocket Connection Errors**: Check the browser console and server logs for connection refused or handshake errors. Ensure the server is running and accessible.

## Architecture Overview

### Custom Stateful Server

This application uses a custom Express server (`server.ts`) that is **stateful**. It manages:

1. Hosting the Next.js application.
2. A persistent WebSocket server on the `/ws` endpoint.
3. Long-running background services like the Tabata Timer and Spotify Polling.

**CRITICAL**: This architecture is incompatible with serverless deployment platforms like Vercel or Netlify. It must be deployed on a traditional Node.js host (e.g., VPS, Docker container, or a dedicated server).

### Real-time Data Flow

All real-time state updates are managed by the server and pushed to clients via WebSocket.

- **Client → Server**: Send commands (e.g., `TIMER_COMMAND`, `SPOTIFY_COMMAND`) or data (`HRM_INPUT`).
- **Server → Clients**: Broadcasts `STATE_UPDATE` messages containing the latest HR data, timer status, and Spotify track information to all connected clients.

This ensures a single source of truth for application state, keeping all viewers and control panels perfectly in sync.

### Key Services

- **`tabataTimer.ts`**: A state machine managing WORK/REST/IDLE phases. It broadcasts `timerData` and emits `soundToPlay` events for audio feedback.
- **`spotifyPolling.ts`**: Polls the Spotify API every 3 seconds for the "Now Playing" status and handles playback commands. It loads tokens from `logs/spotify_tokens.json` for persistence.
- **`spotifyTokenManager.ts`**: Automatically refreshes the Spotify access token every 55 minutes and saves it to the file system, ensuring the server can survive restarts without requiring re-authentication.

## Development Guidelines

1. **Run the custom server**: Always use `npm run dev` for development to ensure all background services are running.
2. **State Management**: All global state is owned by the server. Client-side state should be ephemeral.
3. **UI Components**: Use Material-UI (MUI) for all components.
4. **Code Quality**: Run `npm run lint` before committing changes.
5. **Visual Testing**: Update visual regression tests (`npm run test:visual:update`) after making intentional UI changes.

For more detailed guidelines, especially for AI agents, see [.github/copilot-instructions.md](.github/copilot-instructions.md).

## License

MIT

## Acknowledgments

- Next.js for the React framework
- Material-UI for components
- NextAuth for Spotify OAuth
- PM2 for process management
