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

## CI/CD and Automation

Our CI/CD pipeline automates many aspects of the development process, including linting, testing, and deployment. We also have several automated workflows to help with tasks such as squashing and rebasing PRs, resolving conflicts, and analyzing technical debt.

### PR-Squash Behaviors

To maintain a clean and linear Git history, we use a `pr-squash` command to squash all commits in a pull request into a single commit. This is done before merging to the `leader` branch.

### AI Review Throttling

To prevent excessive notifications and redundant reviews, our AI code review workflow includes time-based throttling and comment count limits. A manual override is available for on-demand reviews.

### WebSocket Architecture

The application uses WebSockets for real-time communication between the client and server. The WebSocket implementation includes a heartbeat/ping-pong mechanism to ensure a stable connection. When the server hasn't received a message from a client for a certain period, it sends a "ping" message. The client then responds with a "pong" message to indicate that it's still connected.

## Deployment Strategy

The project is deployed to a self-hosted production environment using a GitHub Actions workflow. The deployment follows a "hard restart" strategy.

## Future Plans (Long Term)

- Integrate guidelines into the CI/CD pipeline.
- Create development setup scripts that enforce standards.
- Build custom linting rules for project-specific patterns.

## Testing

For a comprehensive guide on testing, including our testing structure, commands, and best practices, please refer to the [Testing Guide](./TESTING.md).
