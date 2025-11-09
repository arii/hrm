# HRM (Heart Rate Monitor) Dashboard

This repository contains the HRM dashboard built with Next.js and a custom Node server.

Important: this project uses a custom server entry (`server.ts`) that runs the Next.js app, a persistent WebSocket server, and background services (Tabata timer, Spotify polling). The server is stateful and is not compatible with serverless platforms like Vercel.

## Getting started (development)

We provide PM2-based development scripts that start the server (with `ts-node`) and keep the process in the foreground so you can see logs while developing.

```bash
# Run the development server (pm2 in foreground, watch files)
npm run dev

# Force IPv4 loopback binding (127.0.0.1) and run in dev mode
npm run dev:clean

# Alternate: run via the VS Code launch configuration (recommended)
# Open the Run panel (Ctrl+Shift+D) and run "Launch HRM Server (pm2)"
```

## Build and production

To build the Next.js app and start the server under PM2 in production mode:

```bash
npm run build
npm run start    # starts pm2 using ecosystem.config.js in production env
```

## Logs (PM2)

PM2 will write logs to the `./logs/` directory (configured in `ecosystem.config.js`). You can also stream logs with:

```bash
npm run pm2:logs
```

## VS Code integration

This repository includes workspace VS Code settings and launch/tasks to speed development:

- `.vscode/settings.json` — formatting (Prettier), ESLint fix-on-save, Emmet for TSX, and import auto-update.
- `.vscode/launch.json` — launch configuration to run the dev server and attach the debugger.
- `.vscode/tasks.json` — helper tasks to start dev scripts.

## Project structure highlights

Key files and directories:

- `server.ts` — custom server entry (Express + WebSocket + background services). This is the authoritative entry point in development and production.
- `app/` — Next.js App Router pages and UI.
- `services/` — server-side long-running services (Tabata timer, Spotify polling).
- `utils/socketManager.js` — server-side WebSocket router.
- `ecosystem.config.js` — PM2 configuration for dev and production.

## Contributing

Follow the project's coding conventions (TypeScript, MUI for UI, server-side state in `services/`). Run the formatter and linter before committing:

```bash
npm run lint
npm run format
```

## Questions or issues

If you run into problems starting the server, check `./logs/out.log` and `./logs/err.log` and ensure your `.env.local` contains required secrets (Spotify credentials, NextAuth settings).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
