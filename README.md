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

# Optional: Host binding (defaults to 127.0.0.1)
HOST=127.0.0.1
```

### Spotify Integration Setup & Verification

⚠️ **Common Issue:** "Invalid Client" errors occur when Spotify credentials are misconfigured.

#### Step 1: Create Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Click "Create app"
3. Fill in app details:
   - **App name:** HRM Dashboard (or your choice)
   - **App description:** Heart rate monitoring dashboard with Spotify integration
   - **Redirect URIs:** `http://127.0.0.1:3000/api/auth/callback/spotify`
   - **Which API/SDKs are you planning to use?** Web API
4. Click "Save"
5. Copy your **Client ID** and **Client Secret**

#### Step 2: Configure Redirect URIs

**Critical:** The redirect URI must exactly match what NextAuth expects.

In your Spotify app settings, add these redirect URIs:

- `http://127.0.0.1:3000/api/auth/callback/spotify`
- `http://localhost:3000/api/auth/callback/spotify` (optional fallback)

**Common mistakes:**

- ❌ Missing `/spotify` at the end
- ❌ Using `https` instead of `http` for local dev
- ❌ Using IP address instead of hostname or vice versa
- ❌ Trailing slash in URI

#### Step 3: Update .env.local

```bash
SPOTIFY_CLIENT_ID=your_actual_client_id_here
SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

#### Step 4: Verify Configuration

Run the debug endpoint to check credentials:

```bash
# Start the server
npm run dev:clean

# In another terminal, test auth check endpoint
curl http://127.0.0.1:3000/api/debug/auth-check

# Expected output (if configured correctly):
# {
#   "nextAuthConfigured": true,
#   "spotifyConfigured": true,
#   "clientId": "e3f3c3111...",
#   "redirectUri": "http://127.0.0.1:3000/api/auth/callback/spotify"
# }
```

#### Step 5: Test OAuth Flow

1. Navigate to http://127.0.0.1:3000/client/control
2. Click "Login with Spotify" button
3. You should be redirected to Spotify's authorization page
4. After approving, you should be redirected back to the control panel
5. The control panel should display "Now Playing" information

#### Troubleshooting Spotify Integration

**Error: "Invalid client"**

This means Spotify doesn't recognize your credentials. Check:

```bash
# 1. Verify credentials are loaded
curl http://127.0.0.1:3000/api/debug/auth-check | jq

# 2. Check if .env.local is being read
cat .env.local | grep SPOTIFY

# 3. Restart server after changing .env.local
npm run pm2:stop && npm run dev:clean

# 4. Verify redirect URI in Spotify dashboard matches exactly
# It should be: http://127.0.0.1:3000/api/auth/callback/spotify
```

**Error: "Redirect URI mismatch"**

The redirect URI in your Spotify app settings doesn't match what NextAuth is sending.

1. Check your Spotify app's redirect URIs at https://developer.spotify.com/dashboard
2. Add `http://127.0.0.1:3000/api/auth/callback/spotify`
3. Make sure there are no typos or extra characters
4. Click "Save" in the Spotify dashboard

**Token refresh issues**

```bash
# Check token status
curl http://127.0.0.1:3000/api/debug/spotify-token-status

# Check token delivery logs
npm run pm2:logs | grep "token-delivery"

# Verify token file exists
cat logs/spotify_tokens.json
```

**Session issues**

```bash
# Check session endpoint
curl http://127.0.0.1:3000/api/debug/session

# Should return session with accessToken if logged in
```

#### Step 6: Verify Real-time Updates

Once logged in, the control panel should show:

- Current track name and artist
- Play/Pause button (active state matches Spotify playback)
- Next/Previous track buttons functional

The Spotify polling service updates every 5 seconds and broadcasts to all connected clients via WebSocket.

#### Debug Endpoints Reference

```bash
# Health check
curl http://127.0.0.1:3000/api/debug/ping

# Auth configuration check
curl http://127.0.0.1:3000/api/debug/auth-check

# Current session (requires login)
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  http://127.0.0.1:3000/api/debug/session

# Spotify token status (server-side)
curl http://127.0.0.1:3000/api/debug/spotify-token-status

# Spotify current token (requires session)
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  http://127.0.0.1:3000/api/debug/spotify-token
```

## Architecture

### WebSocket Data Flow

```
Bluetooth HRM → /client/connect (Web Bluetooth API)
                       ↓
            WebSocket (HRM_INPUT message)
                       ↓
         utils/socketManager.ts (router)
                       ↓
         Broadcast STATE_UPDATE to all clients
                       ↓
      Dashboard (/page.tsx) updates in real-time
```

### Timer Control Flow

```
Control Panel (/client/control)
        ↓
WebSocket (TIMER_COMMAND + config)
        ↓
services/tabataTimer.ts (state machine)
        ↓
Broadcast timer state + soundToPlay
        ↓
useTabataSounds hook plays audio beeps
```

## Testing

### Visual Regression Tests

Playwright tests capture screenshots to verify visual parity:

```bash
# Generate baseline screenshots (first run)
npm run test:visual:update

# Run comparison tests
npm run test:visual

# Interactive UI mode
npm run test:visual:ui
```

Tests cover:

- Main dashboard viewer
- Control panel
- Mock HRM client
- Active timer states
- HR data streaming

## Known Issues & Limitations

1. **Volume Slider** - UI only, not wired to Spotify API yet
2. **Timer Config Persistence** - Work/rest times reset on page reload
3. **Spotify OAuth** - Requires manual login via control panel

## Troubleshooting

### Server won't start

- Check `./logs/server-out.log` and `./logs/server-error.log`
- Verify `.env.local` contains required secrets
- Ensure port 3000 is not in use: `lsof -i :3000`

### WebSocket connection fails

- Verify server is running: `curl http://127.0.0.1:3000`
- Check browser console for connection errors
- Ensure HOST env var matches (default: 127.0.0.1)

### TypeScript errors

```bash
# Check compilation
npx tsc --noEmit

# Run ESLint
npm run lint
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
