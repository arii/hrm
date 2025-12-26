# Copilot Instructions for the HRM Dashboard Project

This document provides context and rules for AI assistants to ensure consistency and adherence to project standards.

## Tech Stack & Core Concepts

- **Framework**: Next.js with a custom, stateful Express server (`server.ts`).
- **Language**: TypeScript
- **UI**: Material-UI (MUI)
- **State Management**: Server-side for global state, pushed to clients via WebSockets. Client-side state is ephemeral and managed with React Context and hooks.
- **Real-time**: A WebSocket server (`ws` package) manages real-time communication.
- **Deployment**: The application is stateful and deployed on a traditional Node.js host using PM2. It is **not** compatible with serverless platforms like Vercel.

## Rules & Guidelines

### 1. Package Manager: ALWAYS use `pnpm`

- **Correct**: `pnpm install`, `pnpm add <package>`, `pnpm run <script>`, `pnpm exec <command>`
- **Incorrect**: `npm ...`, `npx ...`, `yarn ...`
- **Reasoning**: The project is standardized on `pnpm` to ensure deterministic dependency installation via `pnpm-lock.yaml`. Using `npm` or `yarn` will cause lockfile conflicts and break the build.

### 2. Linting: Assume Pre-commit Hooks Handle It

- **Rule**: Do not suggest adding manual linting steps to developer workflows or CI scripts.
- **Context**: The repository is configured with Husky and lint-staged. Code is automatically formatted with Prettier and linted with ESLint before every commit.
- **When to suggest manual linting**: Only suggest `pnpm run lint` or `pnpm run lint:fix` if the goal is to check the entire project, not just staged files.

### 3. Deployment Context

- **Branch**: Production deployment always targets the `leader` branch.
- **Mechanism**: Deployment is handled by a `deploy.sh` script on the production host. This script pulls the latest `leader` branch and reloads the application using `pm2 reload`.
- **Environment**: The production server requires a `.env.production` file.

### 4. Code Style & Patterns

- **Imports**: Use `@/*` path aliases for absolute imports from the root directory.
- **Components**: Use Material-UI (MUI) components for all UI elements.
- **State**: Remember that the server is the single source of truth for all shared application state. Client-side actions should send commands to the server rather than modifying local state directly.
