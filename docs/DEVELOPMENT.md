# Development Guide

This document provides a comprehensive overview of the development process for the HRM project, from initial setup to deployment. It covers our core principles, development workflows, and architectural standards. For a detailed list of enforceable standards and configurations, please refer to the [Development Standards](./DEVELOPMENT_STANDARDS.md) document.

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

## Reference Guides

For detailed information on specific topics, please refer to the following documents:

- [TypeScript Best Practices](./TYPESCRIPT_PATTERNS.md)
- [Environment Variable Handling](./ENVIRONMENT_VARIABLES.md)
- [Testing Guidelines](./TESTING_GUIDELINES.md)
- [Hook Design Patterns](./HOOK_DESIGN_PATTERNS.md)
- [Code Review Guidelines](./CODE_REVIEW_GUIDELINES.md)

## Core Principles

- **Quality & Security First**: We prioritize writing high-quality, secure code. All contributions are subject to a thorough review process.
- **Consistency**: A consistent codebase is easier to understand and maintain. We adhere to established patterns and style guides.
- **Continuous Improvement**: We are always looking for ways to improve our code, processes, and tools.

## Pull Request (PR) Process

### PR Scope

To ensure a smooth and efficient review process, every PR must be tightly scoped.

- **One Logical Change Per PR**: Each PR should address a single concern (e.g., one bug fix, one feature).
- **Separate Refactoring**: Architectural changes and large-scale refactoring should be done in separate PRs from feature work or bug fixes.
- **Focused Fixes**: Critical patches or hotfixes must be tightly focused on the issue at hand, without any unrelated changes.

Refer to the PR template for a detailed scope validation checklist.

### Security & Quality Review

The security and quality review process is a critical step in our development lifecycle. It helps us catch potential issues before they make it into production.

- **Standardized Review Format**: We use a standardized format for security and quality summaries to ensure consistency and thoroughness.
- **File-by-File Audit**: A file-by-file audit approach ensures that every change is carefully examined.
- **Iterative Feedback**: We encourage multiple review cycles with iterative feedback to achieve the best possible outcome.

## Quality Assurance Tooling

To maintain code quality and consistency, this project uses a combination of automated tooling.

### Automated Linting and Formatting with Husky

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automate code quality checks before each commit. When you run `git commit`, the following actions are automatically performed on the files you've staged:

1.  **Prettier**: Your code is automatically formatted to ensure a consistent style across the entire codebase.
2.  **ESLint**: The linter runs to catch potential bugs, enforce best practices, and fix any auto-fixable issues.

If ESLint finds errors it cannot fix automatically, the commit will be aborted. You must fix the reported errors before you can successfully commit your changes.

This automated process ensures that code merged into the `leader` branch always adheres to our quality standards without requiring manual checks. You can run these checks for the entire project at any time with `pnpm run lint` and `pnpm run format`.

### Commit Message Standards

To ensure a clean, readable, and automated changelog, this project enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification. For detailed configuration and rules, see the [Development Standards](./DEVELOPMENT_STANDARDS.md).

## CI/CD, Deployment, and Automation

Our CI/CD pipeline automates many aspects of the development process, including linting, testing, and deployment. We also have several automated workflows to help with tasks such as squashing and rebasing PRs, resolving conflicts, and analyzing technical debt.

### Deployment Strategy

The project is deployed to a self-hosted production environment using a GitHub Actions workflow. The deployment follows a "hard restart" strategy.

## Testing

For a comprehensive guide on testing, including our testing structure, commands, and best practices, please refer to the [Testing Guide](./TESTING.md).

## Environment Cleanup

Over time, your development environment may accumulate build artifacts, package manager caches, and other temporary files that can consume significant disk space. The project provides a set of scripts to manage this, offering different levels of cleaning depending on your needs.

### Project-Specific Cleanup (Recommended for most cases)

To remove only the files generated within this project (such as build artifacts, logs, and test results), run the following command:

```bash
pnpm run clean
```

This is the safest and most common cleanup task you will need. It removes:
- `.next/`, `dist/`, `coverage/`, `playwright-report/` directories
- Log files and local test results

### Global Cache Cleanup (Use when needed)

If you need to perform a more thorough cleanup that includes global package manager caches, you can use the `clean:global` command. This is useful when you suspect caches are corrupted or wish to free up a large amount of disk space.

```bash
pnpm run clean:global
```

This command does everything `pnpm run clean` does, plus:
- Purges global caches for `pnpm`, `npm`, `yarn`, and `bun`.
- Clears `pm2` logs.
- Removes Python-related caches from `conda` and `pip`.
- Cleans up GitHub Actions runner artifacts.

### System-Level Cleanup (Advanced)

For system administrators or developers running this project on a dedicated machine, a script is available to clean up systemd journal logs. This can reclaim a significant amount of disk space but requires root privileges.

```bash
sudo ./scripts/vacuum-system-journal.sh
```

## Architectural Decision Records (ADRs)

To ensure that significant architectural decisions are well-reasoned, documented, and consistently applied, we use Architectural Decision Records (ADRs). ADRs capture the context, options considered, and rationale behind important technical choices. For more on the ADR process, see the [Development Standards](./DEVELOPMENT_STANDARDS.md).

All ADRs are stored in the [`docs/adr/`](./adr/) directory.

## Dependency Management and Code Hygiene with Knip

To maintain a clean and efficient codebase, this project uses [Knip](https://knip.dev/) to detect unused files, dependencies, and exports. For detailed configuration and usage, refer to the [Development Standards](./DEVELOPMENT_STANDARDS.md).

## Dependency Management Guidelines

This section clarifies when and why `package.json` and `pnpm-lock.yaml` should be modified. For specific rules on dependency changes, see the [Development Standards](./DEVELOPMENT_STANDARDS.md).

## Architectural Patterns

### Type-Safe API Wrappers

When integrating with third-party libraries that may have incorrect or incomplete TypeScript definitions, we use a type-safe wrapper pattern to ensure our application remains robust. A prime example of this is the `safeSpotifyApi.ts` module.

**Problem**: The `@spotify/web-api-ts-sdk` library does not correctly type the `deviceId` parameter as optional for several of its player methods. This can lead to runtime errors and requires unsafe type assertions in the application code.

**Solution**: The `safeSpotifyApi.ts` module provides a `createSafeSpotifyApi` function that wraps the Spotify SDK instance in a `Proxy`. This proxy intercepts calls to the player methods and dynamically handles the `deviceId` parameter, ensuring that `undefined` values are not passed to the SDK. This encapsulates the workaround in a single, reusable module, eliminating the need for scattered type assertions and improving the overall type safety of the codebase.

### Reactive Data Liveness Detection

To handle real-time data streams that may stop unexpectedly (e.g., hardware failure or signal loss), the application implements a reactive liveness detection pattern. This ensures that the UI remains accurate even if no explicit "disconnect" message is received over the WebSocket.

**Key Components:**
- **`useHeartRateLiveness` Hook**: Calculates data staleness and expiration by comparing the `updatedAt` (server-side) or `lastUpdate` (client-side) timestamps with a reactive `now` timestamp. It adds `isDataStale` and `isExpired` flags to the HRM data.
- **Centralized Thresholds**: Liveness thresholds are defined in `constants/hrm.ts` (`HRM_STALE_WARNING_MS` and `HRM_STALE_THRESHOLD_MS`).

**Usage Pattern:**
Components that display real-time data should consume hooks that implement this liveness check. For example, `HrmTiles` uses `useFilteredHrmTiles` to automatically remove tiles that have exceeded the expiration threshold.
