# Development Notes

> [!NOTE]
> For a comprehensive guide to our coding standards, PR processes, and architectural patterns, please see the new **[Development Standards](./DEVELOPMENT_STANDARDS.md)** document. This file now serves as a high-level overview of ongoing work.

## Setup Instructions

For a fully automated setup, please refer to the "One-Click Start with DevContainer" instructions in the main [README.md](../README.md).

For manual setup, the project includes a script to ensure a consistent environment:

```bash
./scripts/setup.sh
```

This script will:

1.  Create a `.env.local` file from the example if one doesn't exist.
2.  Install all dependencies using `pnpm`.

> **⚠️ Important**: This project uses `pnpm` as its package manager. **Do not use `npm install`**, as this will create a `package-lock.json` file, causing conflicts with the official `pnpm-lock.yaml`. The pre-commit hooks will block any commits that include this file.

## Quality Assurance Tooling

To maintain code quality and consistency, this project uses a combination of automated tooling.

### Automated Linting and Formatting with Husky

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automate code quality checks before each commit. When you run `git commit`, the following actions are automatically performed on the files you've staged:

1.  **Prettier**: Your code is automatically formatted to ensure a consistent style across the entire codebase.
2.  **ESLint**: The linter runs to catch potential bugs, enforce best practices, and fix any auto-fixable issues.

If ESLint finds errors it cannot fix automatically, the commit will be aborted. You must fix the reported errors before you can successfully commit your changes.

This automated process ensures that code merged into the `leader` branch always adheres to our quality standards without requiring manual checks. You can run these checks for the entire project at any time with `pnpm run lint` and `pnpm run format`.

### CI Workflow for Empty Commits

To optimize CI resource usage and improve developer experience, the `pr-quality.yml` workflow includes special handling for "empty" commits. An empty commit is one that does not introduce any file changes, such as a commit created by a rebase or an automated tool.

When an empty commit is pushed to a pull request, the workflow performs the following steps:

1.  **Detects No Changes**: The `check-diff` job identifies that no files have been modified.
2.  **Skips CI Jobs**: All major CI jobs (lint, build, test) are skipped to avoid redundant work.
3.  **Copies Check Statuses**: The `copy-checks` job fetches the list of required status checks from the branch protection rules and copies the conclusions (e.g., `success`, `failure`) from the parent commit.

This ensures that the pull request still meets branch protection requirements and can be merged, without wasting time and resources on unnecessary CI runs.

### Commit Message Standards

To ensure a clean, readable, and automated changelog, this project enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Guidance vs. Enforcement:**

This project uses a two-layered approach to commit message validation:

- **Local Hook (Guidance)**: The local `commit-msg` hook is intentionally **non-blocking**. Its role is to provide immediate **guidance**. If your commit message does not meet the standards, it will print a `⚠️ warning` but **will still allow you to commit**. This is designed to reduce friction during local development, especially for "work-in-progress" commits or when you need to create a commit quickly.

- **CI Workflow (Enforcement)**: The `Lint Commit Messages` GitHub Actions workflow is the project's source of truth for **enforcement**. It runs on every pull request and will **fail** if any commit message in the PR does not adhere to the rules. The workflow will post a comment on the PR with a link to the failed job's logs for easy debugging. A pull request with a failing `commitlint` check **cannot be merged**.

**Key Rules ([`commitlint.config.cjs`](../commitlint.config.cjs)):**

- **Type Prefix is Required**: Your commit message must start with a type (e.g., `feat:`, `fix:`, `chore:`, `docs:`).
- **Subject Casing is Flexible**: The subject can be in any case (e.g., `feat: Add new feature` or `feat: add new feature`).
- **Subject Length**: The subject line must be no longer than 100 characters.
- **Body Line Length**: There is no line length limit for the commit body, so you can paste logs or detailed explanations.

For more details on the rules, please refer to the [official commitlint documentation](https://github.com/conventional-changelog/commitlint/#what-is-commitlint).

### Pull Request Automation

#### Squash and Rebase

To maintain a clean and linear Git history, this project provides an automated tool to squash and rebase pull requests.

**Usage**:

1.  Open a pull request.
2.  Ensure all checks have passed and the PR is ready for merging.
3.  Add a comment to the PR containing one of the following commands:
    - `@pr-squash`
    - `@pr-squash-rebase`

**What it does**:

- The GitHub Action will be triggered by the comment.
- It will squash all commits in the pull request into a single commit.
- The commit message for the squashed commit will be automatically generated from the pull request's title and body.
- The squashed commit will be rebased on top of the latest commit of the target branch (e.g., `leader`).
- The action will then force-push the updated branch to the pull request.

**Conflict Handling**:

If the action encounters a merge conflict during the rebase, it will fail gracefully. It will post a comment on the pull request informing you that the rebase could not be completed automatically and that manual intervention is required.

> **Note on Protected Branches**: For this action to work on a protected branch, the repository's settings may need to be adjusted to allow the `github-actions[bot]` to push to the branch. For more information, see the [GitHub documentation on managing protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches).

#### Automated Technical Debt Analysis

This project includes a workflow to automatically analyze pull requests for technical debt and create deduplicated GitHub issues.

**Usage**:

1.  Navigate to the "Actions" tab of the repository.
2.  Select the "Technical Debt Analysis" workflow.
3.  Click "Run workflow".
4.  Enter the pull request number you wish to analyze.

**What it does**:

- The workflow retrieves the diff of the specified pull request.
- It uses the Gemini API to analyze the diff for potential technical debt.
- For each piece of identified debt, it generates a unique "fingerprint".
- It searches for open issues with the same fingerprint to prevent duplicates.
- If no duplicate is found, it creates a new issue with the "tech-debt" and "ai-generated" labels.

### Legacy Pre-commit Hooks

The project contains legacy Python-based pre-commit hooks (`.pre-commit-config.yaml`). These are now considered **deprecated** in favor of the Husky-based Node.js tooling. The Python hooks will be removed in a future pull request to eliminate redundancy.

## Current Focus

The primary focus of ongoing development is to enhance the user experience and improve the long-term maintainability of the application. Key priorities include:

- **UI/UX Polish**: Implementing the enhancements outlined in [FRONTEND_IMPROVEMENT_PLAN.md](./FRONTEND_IMPROVEMENT_PLAN.md), focusing on typography, color consistency, and mobile optimization.
- **Accessibility**: Ensuring the application is fully accessible by meeting WCAG 2.1 AA compliance, including keyboard navigation and screen reader support.
- **Test Suite Optimization**: Consolidating and stabilizing the test suite as described in [TESTING.md](./TESTING.md) to ensure faster and more reliable CI/CD feedback.
- **Code Quality & Documentation**: Continuously refactoring components for clarity and keeping all development documentation up-to-date.

## Completed Milestones

- **Tabata Timer Refactoring**: The `TabataTimer` service was successfully refactored to support both stopwatch and Tabata modes with a more robust and maintainable architecture.
- **Spotify Controls Overhaul**: The Spotify controls were redesigned and implemented, including volume control, device selection, and improved UI feedback.
- **Bluetooth Connection Flow**: The Bluetooth HRM connection page (`client/connect`) was stabilized and now includes auto-connect functionality.

## GitHub Integrations

### Jules AI Session Management

This project uses a GitHub Actions workflow to manage Jules AI sessions directly from pull request comments. The following commands are available to authorized users (OWNER, MEMBER, or COLLABORATOR):

- `@jules-new`: Creates a new Jules session based on the context of the pull request.
- `@jules-delete`: Deletes the Jules session associated with the pull request. If `@jules-new` has been used multiple times, this command will only delete the most recently created session.

**Runner Environment:**

This workflow is configured to run on `self-hosted` runners. This is an intentional design choice to ensure a consistent and secure environment for interacting with the Jules API. The self-hosted runner is expected to have the following tools pre-installed:

- `gh` (GitHub CLI)
- `jq`
- `python3`
- `pip`

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
