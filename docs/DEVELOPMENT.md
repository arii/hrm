# Development Overview

This document provides a high-level overview of the development process for the HRM project. For detailed rules and standards, please refer to the [Development Standards](./DEVELOPMENT_STANDARDS.md) document.

## Getting Started

For a fully automated setup, please refer to the "One-Click Start with DevContainer" instructions in the main [README.md](../README.md).

For manual setup, the project includes a script to ensure a consistent environment:

```bash
./scripts/setup.sh
```

This script will:

1.  Create a `.env.local` file from the example if one doesn't exist.
2.  Install all dependencies using `pnpm`.

> **⚠️ Important**: This project uses `pnpm` as its package manager. **Do not use `npm install`**, as this will create a `package-lock.json` file, causing conflicts with the official `pnpm-lock.yaml`. The pre-commit hooks will block any commits that include this file.

## Core Principles

We follow a set of core principles to ensure the quality and maintainability of our codebase. These include prioritizing quality and security, maintaining consistency, and fostering a culture of continuous improvement. For a detailed explanation of these principles, see the [Core Principles section in the Development Standards](./DEVELOPMENT_STANDARDS.md#core-principles).

## Pull Request (PR) Process

All changes are submitted via Pull Requests. We follow a strict process to ensure that all PRs are well-scoped, reviewed, and tested. For detailed information on the PR process, including scope, security and quality reviews, and automation, please see the [Pull Request (PR) Process section in the Development Standards](./DEVELOPMENT_STANDARDS.md#pull-request-pr-process).

## CI/CD, Deployment, and Automation

Our CI/CD pipeline automates many aspects of the development process, including linting, testing, and deployment. For detailed information on our automation workflows, deployment strategy, and WebSocket architecture, please see the [CI/CD and Automation section in the Development Standards](./DEVELOPMENT_STANDARDS.md#cicd-and-automation).

### WebSocket Heartbeat Strategy

To ensure connection stability and clean up "zombie" clients, the WebSocket server has a heartbeat mechanism.

1.  **Ping/Pong**: The server periodically sends a `ping` message to each connected client.
2.  **Client Response**: A healthy client immediately responds with a `pong` message.
3.  **Disconnection Logic**: If the server does not receive a `pong` response after a certain number of pings (configured by `WEBSOCKET_MAX_MISSED_PONGS`), it considers the client disconnected and terminates the connection.
4.  **Grace Period**: After termination, a grace period (configured by `WEBSOCKET_GRACE_PERIOD_MS`) begins, allowing the client to reconnect and resume its session without data loss. If the client does not reconnect within this period, its resources are cleaned up from the server.

This strategy ensures that server resources are not consumed by unresponsive clients and that legitimate clients can recover from temporary network disruptions.

## Testing

For a comprehensive guide on testing, including our testing structure, commands, and best practices, please refer to the [Testing Guide](./TESTING.md).
