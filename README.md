# HRM (Heart Rate Monitor) Dashboard

A real-time heart rate monitoring dashboard built with Next.js, Material-UI, WebSockets, and Spotify integration. Features a custom Express server for stateful WebSocket connections, Tabata timer with audio feedback, and live HR zone visualization.

**⚠️ Important:** This project uses a custom server entry (`server.ts`) that runs Next.js, a persistent WebSocket server, and background services. The server is stateful and **cannot be deployed on serverless platforms** like Vercel.

## Table of Contents

- [HRM (Heart Rate Monitor) Dashboard](#hrm-heart-rate-monitor-dashboard)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Quick Start](#quick-start)
    - [One-Click Start with DevContainer (Recommended)](#one-click-start-with-devcontainer-recommended)
    - [Manual Setup](#manual-setup)
    - [Production Build](#production-build)
  - [Project Structure](#project-structure)
  - [Available Commands](#available-commands)
    - [Primary Scripts](#primary-scripts)
    - [Navigation Shortcuts](#navigation-shortcuts)
    - [Testing \& Verification](#testing--verification)
  - [VS Code Integration](#vs-code-integration)
  - [Environment Variables](#environment-variables)
    - [Spotify Setup](#spotify-setup)
    - [Audio System](#audio-system)
  - [Documentation](#documentation)
  - [Architecture Overview](#architecture-overview)
    - [Custom Stateful Server](#custom-stateful-server)
    - [Real-time Data Flow](#real-time-data-flow)
    - [Architecture Diagram](#architecture-diagram)
    - [Key Services](#key-services)
  - [Development Guidelines](#development-guidelines)
  - [Contributing](#contributing)
  - [Production Readiness Focus](#production-readiness-focus)
  - [Recent Architecture Improvements](#recent-architecture-improvements)
    - [Audio System Integration](#audio-system-integration)
    - [UI/UX Enhancements](#uiux-enhancements)
    - [Production Readiness](#production-readiness)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Features

- **Real-time Heart Rate Monitoring** - WebSocket streaming from Bluetooth HRM devices or mock client
- **Dual-Mode Timer** - Tabata (work/rest intervals) and Stopwatch (count-up) modes with 5-second prepare countdown
- **Audio Feedback** - Original HRM beep sounds for countdown (3-2-1) and phase transitions
- **HR Zone Visualization** - Large percentage tiles with color-coded zones and user names/ages
- **Spotify Integration** - Full playback control, device selection, volume control, and now-playing display
- **Mock HRM Client** - Test interface with zone buttons, device ID, and noise simulation (available at `/client/mock`)
- **Control Panel** - Mobile-optimized UI with timer controls, Spotify controls, and configuration steppers (available at `/client/control`)
- **Bluetooth HRM Support** - Real heart rate monitor connection via Web Bluetooth API (available at `/client/connect`)
- **Visual Regression Tests** - Playwright screenshot-based testing
- **Performance Monitoring** - Prometheus metrics exposed at the `/metrics` endpoint for monitoring API response times, resource utilization, and more.

## Quick Start

### One-Click Start with DevContainer (Recommended)

This repository is configured with a VS Code DevContainer, which provides a fully automated, "one-click" setup.

1.  **Prerequisites**:
    *   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
    *   [Visual Studio Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

2.  **Launch**:
    *   Open the repository in VS Code.
    *   Click the "Reopen in Container" button when prompted.

That's it. The container will build, install all dependencies (`npm ci` and Playwright), and create a `.env.local` file for you. Once the container is ready, you can start the development server:

```bash
npm run dev
```

### Manual Setup

If you are not using the DevContainer, you can set up the project manually:

#### Prerequisites

Before setting up the project locally, ensure you have the following installed on your system:

- **Node.js** (version 18.x or higher recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **pnpm** (Package Manager)
  - Install globally: `npm install -g pnpm`
  - Verify installation: `pnpm --version`

- **Git**
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

#### Step-by-Step Setup Instructions

**1. Clone the Repository**

```bash
# Clone the repository to your local machine
git clone https://github.com/arii/hrm.git

# Navigate to the project directory
cd hrm
```

**2. Install pnpm (if not already installed)**

```bash
# Install pnpm globally using npm
npm install -g pnpm

# Verify pnpm installation
pnpm --version
```

**3. Install Project Dependencies**

```bash
# Install all required dependencies using pnpm
pnpm install --frozen-lockfile
```

This will install all the Node.js packages required by the project, including Next.js, Material-UI, and other dependencies.

**4. Install Playwright Browser Dependencies**

```bash
# Install Playwright browsers for testing
npx playwright install --with-deps
```

**5. Set Up Environment Variables**

```bash
# Create your local environment file from the example
cp .env.example .env.local
```

Then open `.env.local` and fill in the required values:

```bash
# Spotify OAuth credentials (get these from developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# NextAuth.js configuration
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=your_random_secret_here
```

To generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

**6. Start the Development Server**

```bash
# Start the custom server (Next.js + WebSocket + background services)
pnpm run dev
```

The server will start and you should see output indicating:
- Next.js app running on http://127.0.0.1:3000
- WebSocket server on ws://127.0.0.1:3000/ws
- Spotify polling service initialized
- Tabata timer service initialized

**7. Verify the Setup**

Open your browser and navigate to:
- **Dashboard**: http://127.0.0.1:3000
- **Mock HRM Client**: http://127.0.0.1:3000/mock
- **Phone Controls**: http://127.0.0.1:3000/phone
- **Bluetooth Connection**: http://127.0.0.1:3000/connect

You should see the HRM dashboard interface load successfully.

**8. (Optional) Verify Spotify Integration**

```bash
# Run the Spotify verification script
pnpm run verify:spotify
```

This will test your Spotify credentials and connection.

#### Troubleshooting Setup Issues

If you encounter issues during setup:

- **Port 3000 already in use**: Kill any process using port 3000, or use `pnpm run pm2:stop` if PM2 is running
- **Module not found errors**: Ensure all dependencies are installed with `pnpm install --frozen-lockfile`
- **Playwright errors**: Run `npx playwright install --with-deps` again
- **Environment variable issues**: Double-check that `.env.local` exists and contains valid values

For more detailed troubleshooting, see the [Troubleshooting](#troubleshooting) section below.


> **⚠️ Package Manager Change**: This project now uses **pnpm** instead of npm. All `npm` commands are blocked to prevent `package-lock.json` creation.

```bash
# 1. Create your environment file from the example
cp .env.example .env.local

# 2. Fill in the required values in .env.local (see "Environment Variables" section)

# 3. Install pnpm if not already installed
npm install -g pnpm

# 4. Install dependencies using the lockfile
pnpm install --frozen-lockfile

# 5. Install Playwright's browser dependencies
npx playwright install --with-deps

# 6. Start the development server
pnpm run dev
```

> **Migration from npm**: If you accidentally run `npm install`, the project will block it and show a helpful message. Use the wrapper script `./scripts/npm-to-pnpm.sh` to automatically convert npm commands to pnpm equivalents.

The server will start with:

- Next.js app on http://127.0.0.1:3000
- WebSocket server on ws://127.0.0.1:3000/ws
- Spotify polling service
- Tabata timer service

### Production Build

```bash
# Build TypeScript server and Next.js app (optional; npm run start auto-builds if needed)
npm run build

# Start with PM2 (requires .env.production)
npm run start

# View logs
npm run pm2:logs
```

`npm run start` now checks for `.env.production` and verifies build artifacts. When `.next/` or
`dist/server.mjs` are missing it runs `npm run build` before launching PM2, so manual builds are
only required when you want to inspect the output ahead of time.

## Project Structure

- **`server.ts`**: Custom Express + Next.js + WebSocket entry point
- **`app/page.tsx`**: Main dashboard with timer, HR tiles, Spotify controls, and Google Doc viewer
- **`app/client/control/ControlPanel.tsx`**: Mobile control panel container for timer/Spotify controls and Tabata configuration
- **`app/client/control/components/TimerControls.tsx`**: Dedicated Tabata/Stopwatch control surface with sticky layout
- **`app/client/control/components/SpotifyControls.tsx`**: Mobile-friendly Spotify playback controls and synced volume slider
- **`app/client/mock/page.tsx`**: Mock HRM data sender for testing
- **`app/client/connect/page.tsx`**: Bluetooth HRM connector with user name/age input
- **`services/tabataTimer.ts`**: Dual-mode timer service (Tabata/Stopwatch) with audio cues
- **`services/spotifyPolling.ts`**: Spotify API polling and playback control service
- **`utils/audioManager.ts`**: Audio system for timer beep sounds
- **`hooks/useWebSocket.ts`**: Client-side WebSocket connection hook
- **`hooks/useAudio.ts`**: Audio playback hook with volume control
- **`hooks/useVolumePreference.ts`**: Synchronized volume preference across tabs
- **`components/TimerDisplay.tsx`**: Large timer display with rotated side labels
- **`components/HrmTiles.tsx`**: Dashboard wrapper that renders live heart rate tiles with skeleton fallbacks
- **`components/HrTile.tsx`**: Reusable heart rate percentage tile component
- **`components/SpotifyDisplay.tsx`**: Fixed bottom playback bar with volume/device controls
- **`utils/socketManager.ts`**: Server-side WebSocket message router
- **`types/index.ts`**: Shared UI prop types and timer enums
- **`tests/playwright/core-functionality.spec.ts`**: Screenshot-based tests
- **`utils/metrics.ts`**: Prometheus metrics configuration.

## Monitoring

The server exposes performance metrics in a Prometheus-compatible format at the `/metrics` endpoint. This allows for detailed monitoring of the application's performance.

### Setting up Monitoring with Prometheus and Grafana

1.  **Run Prometheus**:
    Create a `prometheus.yml` file with the following configuration:

    ```yaml
    scrape_configs:
      - job_name: 'hrm-dashboard'
        scrape_interval: 5s
        static_configs:
          - targets: ['localhost:3000']
    ```

    Then, create a Docker network and run Prometheus and Grafana on it:

    ```bash
    # Create a Docker network for monitoring
    docker network create monitoring

    # Run Prometheus on the network
    docker run -d --name prometheus --network monitoring -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus

    # Run Grafana on the network
    docker run -d --name grafana --network monitoring -p 3001:3000 grafana/grafana
    ```

2.  **Configure Grafana**:
    - Open Grafana in your browser at `http://localhost:3001` (admin/admin).
    - Add Prometheus as a data source. Use `http://prometheus:9090` as the URL.
    - Import a dashboard (e.g., Node.js Application Dashboard - ID `16219`) and configure it to use your Prometheus data source.

## Available Commands

### Primary Scripts

```bash
npm run dev                 # Start dev server (Next.js + WebSocket + services)
npm run build               # Build for production
npm run start               # Start production server with PM2
npm run lint                # Run ESLint
npm run lint:fix            # Auto-fix lint issues
npm run format              # Format codebase with Prettier
npm run format:check        # Verify formatting without writing
npm run test:core           # Canonical Playwright suite (chromium baseline screenshots)
npm run test:quick          # Fast smoke run (Playwright, dot reporter)
npm run test:visual:update  # Regenerate baseline screenshots after intentional UI changes
npm run test:visual:headed  # Run Playwright in headed mode for debugging
npm run test:visual:ui      # Launch Playwright interactive UI
npm run test:visual:report  # View the latest Playwright HTML report
npm run test:clean          # Kill stray processes, boot dev server, run baseline tests
npm run test:clean:update   # Clean start + regenerate baseline screenshots
npm run verify:spotify      # Automated Spotify integration health check
npm run kill-all            # Force-stop lingering Node/Chrome processes
npm run mcp:chrome-devtools # Start Chrome DevTools MCP (isolated profile)
```

For production, create `.env.production` alongside `.env.local`. The start script refuses to run
without it so sensitive secrets are always loaded before PM2 boots.

### Navigation Shortcuts

The app includes URL redirects for easier navigation:

- `/phone` → `/client/control` (Phone Controls)
- `/connect` → `/client/connect` (Stream HR)
- `/mock` → `/client/mock` (Mock HRM)

### Testing & Verification

- **Baseline visual regression:** `npm run test:core`
- **Snapshot updates (intentional UI changes):** `npm run test:visual:update`
- **Headed debugging:** `npm run test:visual:headed`
- **Interactive runner:** `npm run test:visual:ui`
- **Fast smoke (under a minute):** `npm run test:quick`
- **Clean environment runs:** `npm run test:clean` / `npm run test:clean:update`
- **Reports:** `npm run test:visual:report`
- **Spotify integration health check:** `npm run verify:spotify`

Playwright tests live in `tests/playwright/core-functionality.spec.ts`; baseline screenshots are stored in `tests/playwright/core-functionality.spec.ts-snapshots/`.

**Best practice:** Run `npm run test:core` before pushing UI changes and regenerate snapshots only after manual review.

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

### Audio System

The app includes the original HRM audio feedback system:

- **Countdown beeps**: Short beeps during the last 3 seconds of any countdown phase
- **Transition beeps**: Long beeps when phases change (prepare→work, work→rest, rest→work)
- **Volume control**: Synchronized with Spotify volume controls
- **Audio files**: Located in `public/assets/` (beep-01a.wav, beep-07.wav)

## Documentation

- **[Design Guidelines](DESIGN_GUIDELINES.md)** – Theme, typography, and component standards.
- **[Front-End Improvement Plan](FRONTEND_IMPROVEMENT_PLAN.md)** – Current UI polish backlog and priorities.
- **[Test Improvement Plan](TEST_IMPROVEMENT_PLAN.md)** – Roadmap for expanding automated coverage.
- **[Testing Guide](TESTING.md)** – How to run and interpret the existing suites.
- **[Automation Plan](docs/automation-plan.md)** – Chrome DevTools MCP and automation scripting strategy.

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

### Architecture Diagram

```mermaid
graph TD
    subgraph "Browser"
        A[Next.js Frontend]
        B[WebSocket Client]
    end

    subgraph "Server"
        C[Express Server]
        D[Next.js Middleware]
        E[WebSocket Server]
        F[Tabata Timer Service]
        G[Spotify Polling Service]
    end

    subgraph "External Services"
        H[Spotify API]
        I[Bluetooth HRM Device]
    end

    A -- HTTP Requests --> C
    C -- Forwards to --> D
    B -- WebSocket Connection --> E

    E -- Broadcasts State Updates --> B
    E -- Receives Commands --> B

    F -- Updates --> E
    G -- Updates --> E

    G -- Interacts with --> H
    A -- Interacts with --> I
```

### Key Services

- **`tabataTimer.ts`**: A state machine managing WORK/REST/IDLE phases. It broadcasts `timerData` and emits `soundToPlay` events for audio feedback.
- **`spotifyPolling.ts`**: Polls the Spotify API every 3 seconds for the "Now Playing" status and handles playback commands. It loads tokens from `logs/spotify_tokens.json` for persistence.
- **`spotifyTokenManager.ts`**: Automatically refreshes the Spotify access token every 55 minutes and saves it to the file system, ensuring the server can survive restarts without requiring re-authentication.

## Development Guidelines

1. **Run the custom server**: Always use `npm run dev` for development to ensure all background services are running.
2. **State Management**: All global state is owned by the server. Client-side state should be ephemeral.
3. **UI Components**: Use Material-UI (MUI) for all components.
4. **Code Quality**: Run `npm run lint` before committing changes.
5. **Visual Testing**:
   - Run `npm run test:core` before committing UI changes.
   - Use `npm run test:visual:update` only after verifying differences locally.
   - Reach for `npm run test:visual:headed` or `npm run test:visual:ui` when debugging failures.
   - For end-to-end validation, follow with `npm run test:clean` to exercise the dev server startup path.
6. **Audio Testing**: Test timer sounds on both dashboard and control panel. Audio only plays on dashboard, not control panel.
7. **Layout Consistency**: Timer always takes 50% width, HR tiles 25% each, Google Doc has fixed 500px height.

For more detailed guidelines, especially for AI agents, see [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Contributing

We welcome contributions to the HRM Dashboard! Please follow these guidelines to ensure a smooth development process.

### Code Style

- **Formatting**: This project uses Prettier for code formatting. Please run `npm run format` before submitting a pull request.
- **Linting**: We use ESLint for static analysis. Run `npm run lint` to check for any issues.

### Commit Messages

Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for your commit messages.

### Pull Request Process

1.  Fork the repository and create your branch from `leader`.
2.  Make your changes and ensure all tests pass (`npm test`).
3.  Submit a pull request with a clear description of your changes.

## Production Readiness Focus

1. **Spotify token persistence audits** – Exercise `npm run verify:spotify` after redeploys and confirm `logs/spotify_tokens.json` survives restarts.
2. **Automated baseline capture** – Implement the Playwright-driven screenshot workflow defined in `docs/automation-plan.md` (background dev server + Chrome MCP bootstrap).
3. **Server observability** – Add structured logs for Tabata timer transitions and WebSocket client lifecycle; surface via PM2 log rotation.
4. **Disaster recovery runbook** – Capture restart, log rotation, and SSL renewal steps under `docs/` to unblock production responders.

Track progress by updating the respective markdown plans after each milestone.

## Recent Architecture Improvements

### Audio System Integration

- Copied original HRM audio files from product_hrm
- Implemented AudioManager class for centralized sound control
- Added useAudio hook for React components
- Proper sound mapping: shortBeep (countdown) and longBeep (transitions)

### UI/UX Enhancements

- Consistent layout proportions (no dynamic resizing)
- Rotated side labels on timer display for better space utilization
- Volume synchronization between dashboard and control panel
- Improved mobile navigation with proper labels

### Production Readiness

- Complete deployment scripts and documentation
- PM2 configuration with proper environment handling
- Nginx configuration template
- Pre-deployment validation checks

## License

MIT

## Acknowledgments

- Next.js for the React framework
- Material-UI for components
- NextAuth for Spotify OAuth
- PM2 for process management

## Troubleshooting

### Production Deployment

#### Prerequisites

- Node.js & npm
- PM2 (`npm install -g pm2`)
- Nginx
- A domain name with DDNS
- An SSL certificate (Let's Encrypt is recommended)

#### Deployment Steps

1.  **Build and Start**: Ensure `.env.production` exists, then run `npm run start`. The script verifies build artifacts and kicks off `npm run build` automatically when needed.
2.  **Nginx Configuration**: Ensure Nginx is configured to proxy requests to port 3000 with WebSocket support.
3.  **SSL Configuration**: Ensure SSL certificates are configured and renewed as needed.
4.  **PM2 Startup**: Configure PM2 to start on boot with `pm2 startup`.

### Server Bringup

#### Port 3000 Already in Use

- **Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`
- **Solution**: Find and kill the process using port 3000, or use `npm run pm2:stop`.

#### Module Resolution Errors

- **Symptom**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...`
- **Solution**: Use `npm run dev` for development, and ensure your `tsconfig.json` is configured for CommonJS modules.

#### TypeScript Compilation Errors

- **Symptom**: `error TS2307: Cannot find module ...`
- **Solution**: Verify the file exists, the import path is correct, and the file is included in your `tsconfig.json`.

### Spotify Integration

#### "Invalid Client" Error

- **Cause**: Spotify doesn't recognize your credentials.
- **Fix**: Verify your Client ID and Secret in `.env.local` and restart the server.

#### "Redirect URI Mismatch" Error

- **Cause**: The redirect URI in the Spotify dashboard doesn't match your NextAuth configuration.
- **Fix**: Add the correct redirect URI to your Spotify app settings.

#### Token Not Persisting

- **Symptom**: You have to log in every time the server restarts.
- **Fix**: Check that the `logs/spotify_tokens.json` file exists and is writable.
