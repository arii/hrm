# HRM (Heart Rate Monitor) Dashboard

A real-time heart rate monitoring dashboard built with Next.js, Material-UI, WebSockets, and Spotify integration. Features a custom Express server for stateful WebSocket connections, Tabata timer with audio feedback, and live HR zone visualization.

**⚠️ Important:** This project uses a custom server entry (`server.ts`) that runs Next.js, a persistent WebSocket server, and background services (Tabata timer, Spotify polling). The server is stateful and is not compatible with serverless platforms like Vercel.

## Features

- **Real-time Heart Rate Monitoring** - WebSocket-based streaming from Bluetooth HRM devices
- **Tabata Timer** - Configurable work/rest intervals with audio beeps and visual feedback
- **HR Zone Visualization** - Large percentage tiles with color-coded zones
- **Spotify Integration** - Now playing display with OAuth authentication
- **Mock HRM Client** - Test interface with device ID and noise simulation
- **Control Panel** - Mobile-friendly UI for timer and music controls

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

```
/home/ari/hrm/
├── server.ts                    # Custom Express + Next.js + WebSocket entry point
├── app/
│   ├── page.tsx                 # Main dashboard (viewer)
│   ├── client/
│   │   ├── control/page.tsx     # Timer & music controls
│   │   ├── mock/page.tsx        # Mock HRM data sender
│   │   └── connect/page.tsx     # Bluetooth HRM connector
│   └── api/
│       ├── auth/[...nextauth]/  # NextAuth Spotify OAuth
│       └── debug/               # Debug endpoints
├── services/
│   ├── tabataTimer.ts           # Tabata timer state machine
│   ├── spotifyPolling.ts        # Spotify API polling
│   └── spotifyTokenManager.ts   # Token refresh management
├── components/
│   ├── HrTile.tsx               # Large HR percentage display
│   ├── TimerDisplay.tsx         # Digital timer component
│   └── WorkoutColumns.tsx       # Exercise column display
├── hooks/
│   ├── useWebSocket.ts          # WebSocket connection hook
│   └── useTabataSounds.ts       # Audio feedback (Web Audio API)
├── utils/
│   ├── socketManager.ts         # WebSocket message router
│   └── visualization.ts         # HR zone colors & props
└── tests/playwright/
    └── visual-regression.spec.ts # Screenshot-based tests
```

## Available Commands

### Development

```bash
npm run dev              # Build server and start dev server (foreground)
npm run dev:clean        # Alias for npm run dev
npm run dev:server       # Alias for npm run dev
```

### Building

```bash
npm run build:server     # Compile TypeScript to dist/
npm run build            # Build server + Next.js
npm run start:node       # Run compiled server (node dist/server.js)
npm run start            # PM2 production mode
```

### Testing

```bash
npm run lint             # Run ESLint
npm run test:visual      # Run Playwright visual tests
npm run test:visual:ui   # Interactive test UI
npm run test:visual:update  # Update baseline screenshots
```

### Debugging

```bash
npm run verify:spotify   # Automated Spotify integration health check
npm run pm2:logs         # View PM2 logs
npm run pm2:stop         # Stop PM2 processes
npm run pm2:delete       # Delete PM2 processes
npm run mcp:chrome-devtools  # Start Chrome DevTools MCP
```

## VS Code Integration

The workspace includes VS Code configuration for streamlined development:

- **`.vscode/settings.json`** - Prettier formatting, ESLint fix-on-save, Emmet for TSX
- **`.vscode/launch.json`** - Launch configs to start server and attach debugger
- **`.vscode/tasks.json`** - Helper tasks for dev scripts and Chrome DevTools MCP

### Recommended Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Playwright Test for VS Code

## Environment Variables

Create a `.env.local` file with required secrets:

```bash
# Spotify OAuth (get from https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=your_random_secret_here


### Spotify Setup

1. Create app at https://developer.spotify.com/dashboard
2. Add redirect URI: `http://127.0.0.1:3000/api/auth/callback/spotify`
3. Copy Client ID and Secret to `.env.local`
4. Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
5. Restart server and test: `npm run verify:spotify`

**Detailed setup:** See [SPOTIFY_TROUBLESHOOTING.md](SPOTIFY_TROUBLESHOOTING.md)

## Troubleshooting

- **Server won't start:** See [BRINGUP_TROUBLESHOOTING.md](BRINGUP_TROUBLESHOOTING.md)
- **Spotify issues:** Run `npm run verify:spotify` or see [SPOTIFY_TROUBLESHOOTING.md](SPOTIFY_TROUBLESHOOTING.md)
- **WebSocket errors:** Check browser console and server logs for connection issues

## Architecture

### Custom Server

This app uses a custom Express server (`server.ts`) that:
- Hosts the Next.js application
- Runs a persistent WebSocket server on `/ws`
- Manages background services (Tabata Timer, Spotify Polling)

**Critical:** Do NOT deploy to serverless platforms (Vercel, Netlify). Use a traditional Node.js host or VPS.

### Real-time Communication

All state updates flow through WebSocket:

```
Client → WebSocket → socketManager → Services (Tabata/Spotify)
Services → broadcastState → WebSocket → All Connected Clients
```

Message types:
- `STATE_UPDATE` - Server → Client (HR data, timer state, Spotify status)
- `COMMAND` - Client → Server (timer controls, music controls)
- `HR_DATA` - Client → Server (from HRM devices or mock client)

### Services Architecture

**TabataTimer (`services/tabataTimer.ts`)**
- State machine with WORK/REST/IDLE/COOLDOWN phases
- Broadcasts `timerData` with time remaining, phase, cycle count
- Emits `soundToPlay` for audio feedback

**SpotifyPolling (`services/spotifyPolling.ts`)**
- Polls Spotify API every 3 seconds for "Now Playing"
- Loads tokens from `logs/spotify_tokens.json` on startup
- Broadcasts `spotifyData` with track name, artist, play state
- Handles playback commands (play/pause/next/previous)

**SpotifyTokenManager (`services/spotifyTokenManager.ts`)**
- Auto-refreshes access token every 55 minutes
- Persists tokens to file system for server restart persistence
- Used by SpotifyPolling for token management

### Pages

- **`/`** - Main dashboard (passive viewer, receives WebSocket updates)
- **`/client/control`** - Control panel (sends commands, shows Spotify controls)
- **`/client/mock`** - Mock HRM client (sends fake HR data for testing)
- **`/client/connect`** - Web Bluetooth HRM connector

### Deployment

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm run start  # Uses PM2
```

**Requirements:**
- Node.js 18+
- Port 3000 available
- Traditional server (VPS, dedicated host, Docker)
- NOT compatible with: Vercel, Netlify, AWS Lambda, Cloudflare Workers

## Contributing

This is a personal project for heart rate monitoring during workouts. PRs welcome for bug fixes or feature enhancements.

### Development Guidelines

1. Use `ts-node` for development (don't run compiled `dist/` files)
2. All real-time features must use WebSocket (no polling from client)
3. Use MUI for all components (no Tailwind or CSS Modules)
4. Run `npm run lint` before committing
5. Update visual regression tests if UI changes
6. Run `npm run verify:spotify` after Spotify-related changes

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI agent guidelines.

## License

MIT

## Acknowledgments

- Next.js for the React framework
- Material-UI for components
- NextAuth for Spotify OAuth
- PM2 for process management
