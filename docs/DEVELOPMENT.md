# Development Guide

This document provides a comprehensive overview of the development process for the HRM project, from initial setup to deployment. It covers our core principles, development workflows, and architectural standards.

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

#### PR Scope Guidelines

- **Clear, single purpose:** The title and description of the PR should clearly state the purpose of the change.
- **Relevant changes:** All code changes should be directly related to the stated objective.
- **No unrelated cleanup:** Avoid including unrelated cleanup or refactoring in the same PR.
- **Accurate description:** Ensure the title and description match the actual code changes.
- **Focused testing:** Tests should cover the specific scope of the change.

#### Impact Assessment Guidelines

- Ensure changes are **backward compatible** or that any breaking changes are clearly documented.
- Add or update **tests** to cover new or modified functionality.
- Update **documentation** if the changes affect project usage or architecture.
- Create or update an **ADR** for significant architectural decisions.

## Quality Assurance Tooling

To maintain code quality and consistency, this project uses a combination of automated tooling.

### Automated Linting and Formatting with Husky

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automate code quality checks before each commit. When you run `git commit`, the following actions are automatically performed on the files you've staged:

1.  **Prettier**: Your code is automatically formatted to ensure a consistent style across the entire codebase.
2.  **ESLint**: The linter runs to catch potential bugs, enforce best practices, and fix any auto-fixable issues.

If ESLint finds errors it cannot fix automatically, the commit will be aborted. You must fix the reported errors before you can successfully commit your changes.

This automated process ensures that code merged into the `leader` branch always adheres to our quality standards without requiring manual checks. You can run these checks for the entire project at any time with `pnpm run lint` and `pnpm run format`.

### Commit Message Standards

This project uses the [Conventional Commits](https://www.conventionalcommits.org/) specification so release-please can generate the changelog. The rules live in [`commitlint.config.cjs`](../commitlint.config.cjs).

- The local `commit-msg` hook runs commitlint but is non-blocking. It prints a warning for a non-compliant message and still allows the commit.
- A type prefix is required (`feat:`, `fix:`, `chore:`, `docs:`, and so on).
- The subject may be in any case and must be at most 100 characters.
- The body has no line length limit.

## CI/CD, Deployment, and Automation

Workflows live in `.github/workflows/` (PR quality checks, PR orchestration, release-please, deployment).

### Deployment Strategy

The project is deployed to a self-hosted environment by `.github/workflows/deploy.yml`, which runs `scripts/deploy.sh`.

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
- Root-level TypeScript build info files (`*.tsbuildinfo`)
- The `.cache/` directory (now deprecated for TypeScript build info)
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

Significant architectural decisions are recorded as ADRs in [`docs/adr/`](./adr/).

1.  **Draft**: Copy the [ADR template](./adr/template.md) to `docs/adr/{adr-number}-{title}.md` with status "Proposed".
2.  **Review**: Include the ADR in the pull request for the architectural change.
3.  **Accept**: When the PR merges, set the status to "Accepted".
4.  **Supersede**: If a decision changes, mark the original ADR "Superseded" and link the new one.

## Dependency Management and Code Hygiene with Knip

[Knip](https://knip.dev/) detects unused files, dependencies, and exports. Run it with:

```bash
pnpm run knip
```

If Knip reports unused items, remove them or add them to the ignore lists in `knip.ts` with a comment explaining why.

## Dependency Management Guidelines

- **Adding, updating, or removing a dependency**: the PR must include changes to both `package.json` and `pnpm-lock.yaml`.
- **Security**: run `pnpm audit` and address vulnerabilities before merging.
- **Versions**: use stable releases.
- **Breaking changes**: document them and include migration steps.
- **Verification**: confirm the application builds and tests pass with the new dependencies.
- **Internal modules** that use only built-in APIs or existing dependencies do not need `package.json` or `pnpm-lock.yaml` changes.

## Architectural Patterns

### Direct Third-Party SDK Usage

We prefer using official SDKs directly whenever possible. For the Spotify integration, we use `@spotify/web-api-ts-sdk`.

**Handling 204 No Content**: Some Spotify API endpoints return a `204 No Content` status on success, which can sometimes cause JSON parsing errors in certain environments or older SDK versions. We handle this using the `isEmptyResponseError` utility.

**Consistent Targeting**: All playback commands should explicitly include a `deviceId` when possible to ensure commands are executed on the intended device and to maintain state synchronization across multiple Spotify Connect instances.

### Unified Service Bus (Spotify)

The Spotify integration uses a "Unified Service Bus" architecture. All playback commands (Play/Pause/Skip/Volume) are dispatched from the client via WebSockets as `SPOTIFY_COMMAND` messages. The server handles these messages directly using the official SDK, establishing the server as the single source of truth for both playback execution and state broadcasting. This eliminates complex branching logic between local (browser) and remote (Spotify Connect) devices.

## Service Architecture

The application uses a set of stateful services (Spotify polling, Tabata timer) that are managed by the custom Express server (`server.ts`).

### Service Initialization

Services are initialized once during the server startup process using the `createServices` function in `lib/services.ts`. This function takes a `broadcast` function, which allows services to push updates to all connected WebSocket clients.

### The Singleton Pattern and Next.js Hot-Reloading

In Next.js development mode, the server-side code is frequently recompiled and re-executed. Standard singleton patterns (e.g., `const service = new Service()`) fail because the module is re-executed, creating multiple instances of the service. This can lead to multiple polling loops and inconsistent state.

To solve this, we use a **Global Singleton** pattern. Service instances are attached to `globalThis`, which persists across module re-executions within the same Node.js process.

- **Persistence**: During development, `createServices` checks if service instances already exist on `globalThis`. If they do, it reuses them instead of creating new ones.
- **Global Access**: Attaching services to `globalThis` also allows Next.js API routes (which run in a different context than the initial server startup) to access the same service instances.

For more details on the implementation of this pattern, see [TypeScript Best Practices](./TYPESCRIPT_PATTERNS.md).
