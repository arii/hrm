# Development Standards

This document outlines the best practices and standards for development in the HRM project. These guidelines are derived from learnings from past code reviews and are intended to improve code quality, prevent common issues, and streamline the development process.

## Core Principles

- **Quality & Security First**: We prioritize writing high-quality, secure code. All contributions are subject to a thorough review process.
- **Consistency**: A consistent codebase is easier to understand and maintain. We adhere to established patterns and style guides.
- **Continuous Improvement**: We are always looking for ways to improve our code, processes, and tools.

## Detailed Guidelines

For detailed information on specific topics, please refer to the following documents:

- [TypeScript Best Practices](./TYPESCRIPT_PATTERNS.md)
- [Environment Variable Handling](./ENVIRONMENT_VARIABLES.md)
- [Testing Guidelines](./TESTING_GUIDELINES.md)
- [Hook Design Patterns](./HOOK_DESIGN_PATTERNS.md)

## Architectural Decision Records (ADRs)

To ensure that significant architectural decisions are well-reasoned, documented, and consistently applied, we use Architectural Decision Records (ADRs). ADRs capture the context, options considered, and rationale behind important technical choices.

### When to Create an ADR

An ADR should be created for any change that has a significant impact on the system's architecture, such as:

- Adopting a new framework, library, or technology.
- Changing a core architectural pattern (e.g., state management, data fetching).
- Introducing a new major service or component.
- Modifying a fundamental aspect of the deployment or infrastructure.

### The ADR Process

1.  **Drafting**: Copy the [ADR template](./adr/template.md) to a new file in the `docs/adr/` directory. The filename should be in the format `{adr-number}-{title}.md` (e.g., `0001-use-nextjs-for-frontend.md`). The status should be "Proposed".
2.  **Review**: The new ADR is included in the Pull Request for the architectural change. The PR review process serves as the formal review for the ADR.
3.  **Approval & Status Change**: Once the PR is approved and merged, the ADR's status is updated to "Accepted".
4.  **Updating**: If a decision is later changed, the original ADR should be marked as "Superseded" or "Deprecated" by a new ADR that documents the new decision.

#### Conflict Resolution

Disagreements on architectural decisions are expected and healthy. If a consensus cannot be reached during the PR review, the final decision will be made by the project's technical lead. The goal is to make a decision that is in the best interest of the project, even if it is not everyone's first choice. All viewpoints should be respectfully considered and documented in the ADR.

All ADRs are stored in the [`docs/adr/`](./adr/) directory.

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

To ensure a clean, readable, and automated changelog, this project enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Guidance vs. Enforcement:**

This project uses a two-layered approach to commit message validation:

- **Local Hook (Guidance)**: The local `commit-msg` hook is intentionally **non-blocking**. Its role is to provide immediate **guidance**. If your commit message does not meet the standards, it will print a `⚠️ warning` but **will still allow you to commit**. This is designed to reduce friction during local development, especially for "work-in-progress" commits or when you need to create a commit quickly.

- **CI Workflow (Enforcement)**: The `Lint Commit Messages` GitHub Actions workflow is the project's source of truth for **enforcement**. It runs on every pull request and will **fail** if the PR title or any commit message does not adhere to the rules. The workflow will post a comment on the PR with a link to the failed job's logs for easy debugging. A pull request with a failing `commitlint` check **cannot be merged**.

**Key Rules ([`commitlint.config.cjs`](../commitlint.config.cjs)):**

- **Type Prefix is Required**: Your commit message must start with a type (e.g., `feat:`, `fix:`, `chore:`, `docs:`).
- **Subject Casing is Flexible**: The subject can be in any case (e.g., `feat: Add new feature` or `feat: add new feature`).
- **Subject Length**: The subject line must be no longer than 100 characters.
- **Body Line Length**: There is no line length limit for the commit body, so you can paste logs or detailed explanations.

For more details on the rules, please refer to the [official commitlint documentation](https://github.com/conventional-changelog/commitlint/#what-is-commitlint).

### CI/CD and Automation

Our CI/CD pipeline automates many aspects of the development process, including linting, testing, and deployment. We also have several automated workflows to help with tasks such as squashing and rebasing PRs, resolving conflicts, and analyzing technical debt.

#### PR-Squash Behaviors

To maintain a clean and linear Git history, we use a `pr-squash` command to squash all commits in a pull request into a single commit. This is done before merging to the `leader` branch.

#### AI Review Throttling

To prevent excessive notifications and redundant reviews, our AI code review workflow includes time-based throttling and comment count limits. A manual override is available for on-demand reviews.

### WebSocket Architecture

The application uses WebSockets for real-time communication between the client and server. The WebSocket implementation includes a heartbeat/ping-pong mechanism to ensure a stable connection. When the server hasn't received a message from a client for a certain period, it sends a "ping" message. The client then responds with a "pong" message to indicate that it's still connected.

### Deployment Strategy

The project is deployed to a self-hosted production environment using a GitHub Actions workflow. The deployment follows a "hard restart" strategy.

## Dependency Management and Code Hygiene with Knip

To maintain a clean and efficient codebase, this project uses [Knip](https://knip.dev/) to detect unused files, dependencies, and exports. Knip is integrated into our CI/CD pipeline to ensure that all code additions are continuously monitored for unused code.

### Running Knip Locally

Before submitting a pull request, you can run Knip locally to identify any issues:

```bash
pnpm run knip
```

If Knip reports unused dependencies, files, or exports, please take one of the following actions:

- **Remove the code**: If the reported item is genuinely unused, remove it from the codebase.
- **Update the configuration**: If the item is incorrectly reported (e.g., it's used indirectly), update the `knip.ts` configuration file to ignore it. Add a comment explaining why the ignore rule is necessary.

### Configuration

Knip is configured in the `knip.ts` file in the root of the project. This file defines the entry points for the application, as well as any files or dependencies that should be ignored.

## Dependency Management Guidelines

This section clarifies when and why `package.json` and `pnpm-lock.yaml` should be modified.

### Adding, Updating, or Removing External Dependencies

When a change requires adding, updating, or removing an external package from `node_modules`, the following are required:

- **Required Files**: The PR **must** include changes to `package.json` and `pnpm-lock.yaml`.
- **Security Review**: Before committing, run `pnpm audit` to check for vulnerabilities. If any are found, they must be addressed before merging.
- **Version Verification**: Confirm all new or updated package versions are stable (no alpha/beta/rc).
- **Breaking Changes**: Document any breaking changes introduced by the dependency update and include necessary migration steps.
- **Testing**: Verify the application builds and all tests pass with the new dependencies.

**Example Scenario**: Adding the `date-fns` package to use its date formatting utilities. This would require running `pnpm add date-fns`, which modifies `package.json` and `pnpm-lock.yaml`.

### Creating Internal Modules

When creating new internal modules or utilities (e.g., a new file in `lib/` or `utils/`) that **only** use built-in Node.js APIs or dependencies already listed in `package.json`, changes to `package.json` or `pnpm-lock.yaml` are **not** required.

- **No Lockfile Changes**: The PR should not include modifications to `package.json` or `pnpm-lock.yaml`.

**Example Scenario**: Creating a new file `lib/stringUtils.ts` with helper functions that use built-in JavaScript methods. This does not require any changes to `package.json`.

## Architectural Patterns

### Type-Safe API Wrappers

When integrating with third-party libraries that may have incorrect or incomplete TypeScript definitions, we use a type-safe wrapper pattern to ensure our application remains robust. A prime example of this is the `safeSpotifyApi.ts` module.

**Problem**: The `@spotify/web-api-ts-sdk` library does not correctly type the `deviceId` parameter as optional for several of its player methods. This can lead to runtime errors and requires unsafe type assertions in the application code.

**Solution**: The `safeSpotifyApi.ts` module provides a `createSafeSpotifyApi` function that wraps the Spotify SDK instance in a `Proxy`. This proxy intercepts calls to the player methods and dynamically handles the `deviceId` parameter, ensuring that `undefined` values are not passed to the SDK. This encapsulates the workaround in a single, reusable module, eliminating the need for scattered type assertions and improving the overall type safety of the codebase.
