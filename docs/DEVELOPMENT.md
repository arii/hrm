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

## Testing

For a comprehensive guide on testing, including our testing structure, commands, and best practices, please refer to the [Testing Guide](./TESTING.md).
