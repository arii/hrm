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

#### PR Scope Guidelines

- **Clear, single purpose:** The title and description of the PR should clearly state the purpose of the change.
- **Relevant changes:** All code changes should be directly related to the stated objective.
- **No unrelated cleanup:** Avoid including unrelated cleanup or refactoring in the same PR.
- **Accurate description:** Ensure the title and description match the actual code changes.
- **Focused testing:** Tests should cover the specific scope of the change.

#### Review Strategy & Ignored Files

To optimize the review process and avoid unnecessary AI analysis, the `scripts/decide-review-strategy.sh` script uses an `IGNORE_PATTERN` to identify non-significant changes. PRs containing only changes to these files may skip automatic re-review.

The `IGNORE_PATTERN` regex is: `(\.md$|\.png$|\.svg$|pnpm-lock\.yaml$|\.gitignore$)`

This pattern includes:
- Documentation (`.md`)
- Static assets (`.png`, `.svg`)
- Lock files (`pnpm-lock.yaml`)
- Git configuration (`.gitignore`)

#### Impact Assessment Guidelines

- Ensure changes are **backward compatible** or that any breaking changes are clearly documented.
- Add or update **tests** to cover new or modified functionality.
- Update **documentation** if the changes affect project usage or architecture.
- Create or update an **ADR** for significant architectural decisions.

### Labeling Conventions

To ensure consistency across the project, we use a standardized set of GitHub labels. These labels are used for issue triage, PR categorization, and automated workflows.

All managed labels are defined in [`.github/pr-labels.json`](../.github/pr-labels.json). Automated workflows ensure these labels exist in the repository.

**Key Label Categories (Strictly Limited to 5 per Category):**

- **Review Status**: `ai-reviewed`, `approved`, `changes-requested`
- **Change Type**: `bug`, `enhancement`, `refactor`, `chore`, `documentation`
- **Scope**: `scope:focused`, `scope:needs-review`
- **Priority**: `priority:high`, `priority:medium`, `priority:low`
- **Status**: `needs-info`, `invalid`, `stale`, `duplicate`, `wontfix`
- **Automation**: `automerge`, `auto-code`, `bot-generated`, `triage-needed`

Obsolete or redundant labels (e.g., variations like `CI` or `workflow`) are automatically removed by the `cleanup-pr-labels.sh` script, as configured in [`.github/automated-labels.json`](../.github/automated-labels.json).

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

To ensure that significant architectural decisions are well-reasoned, documented, and consistently applied, we use Architectural Decision Records (ADRs). ADRs capture the context, options considered, and rationale behind important technical choices. For more on the ADR process, see the [Development Standards](./DEVELOPMENT_STANDARDS.md).

All ADRs are stored in the [`docs/adr/`](./adr/) directory.

## Dependency Management and Code Hygiene with Knip

To maintain a clean and efficient codebase, this project uses [Knip](https://knip.dev/) to detect unused files, dependencies, and exports. For detailed configuration and usage, refer to the [Development Standards](./DEVELOPMENT_STANDARDS.md).

## Dependency Management Guidelines

This section clarifies when and why `package.json` and `pnpm-lock.yaml` should be modified. For specific rules on dependency changes, see the [Development Standards](./DEVELOPMENT_STANDARDS.md).

## Architectural Patterns

### Direct Third-Party SDK Usage

We prefer using official SDKs directly whenever possible. For the Spotify integration, we use `@spotify/web-api-ts-sdk`.

**Handling 204 No Content**: Some Spotify API endpoints return a `204 No Content` status on success, which can sometimes cause JSON parsing errors in certain environments or older SDK versions. We handle this using the `isEmptyResponseError` utility.

**Consistent Targeting**: All playback commands should explicitly include a `deviceId` when possible to ensure commands are executed on the intended device and to maintain state synchronization across multiple Spotify Connect instances.

### Unified Service Bus (Spotify)

The Spotify integration uses a "Unified Service Bus" architecture. All playback commands (Play/Pause/Skip/Volume) are dispatched from the client via WebSockets as `SPOTIFY_COMMAND` messages. The server handles these messages directly using the official SDK, establishing the server as the single source of truth for both playback execution and state broadcasting. This eliminates complex branching logic between local (browser) and remote (Spotify Connect) devices.
