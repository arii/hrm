# Development Standards

This document outlines the specific, enforceable standards for development in the HRM project. For a comprehensive overview of the development process, please refer to the [Development Guide](./DEVELOPMENT.md).

## Commit Message Standards

To ensure a clean, readable, and automated changelog, this project enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Guidance vs. Enforcement:**

This project uses a two-layered approach to commit message validation:

- **Local Hook (Guidance)**: The local `commit-msg` hook is intentionally **non-blocking**. It provides immediate guidance by issuing a `⚠️ warning` if a commit message is non-compliant, but it will still allow the commit.
- **CI Workflow (Enforcement)**: The `Lint Commit Messages` GitHub Actions workflow is the source of truth for enforcement. It will **fail** if the PR title or any commit message does not adhere to the rules, preventing a merge.

**Key Rules ([`commitlint.config.cjs`](../commitlint.config.cjs)):**

- **Type Prefix is Required**: Your commit message must start with a type (e.g., `feat:`, `fix:`, `chore:`, `docs:`).
- **Subject Casing is Flexible**: The subject can be in any case.
- **Subject Length**: The subject line must be no longer than 100 characters.
- **Body Line Length**: There is no line length limit for the commit body.

## Architectural Decision Records (ADRs)

The ADR process is as follows:

1.  **Drafting**: Copy the [ADR template](./adr/template.md) to a new file in the `docs/adr/` directory with the format `{adr-number}-{title}.md`. The status should be "Proposed".
2.  **Review**: The new ADR is included in the Pull Request for the architectural change.
3.  **Approval & Status Change**: Once the PR is merged, the ADR's status is updated to "Accepted".
4.  **Updating**: If a decision is changed, the original ADR is marked as "Superseded" by a new ADR.

## Dependency Management and Code Hygiene with Knip

This project uses [Knip](https://knip.dev/) to detect unused files, dependencies, and exports.

### Running Knip Locally

```bash
pnpm run knip
```

If Knip reports unused items, you must either remove them or update the `knip.ts` configuration file to ignore them, with a comment explaining why the rule is necessary.

### Configuration

Knip is configured in the `knip.ts` file in the root of the project. This file defines the entry points for the application, as well as any files or dependencies that should be ignored.

## Dependency Management Guidelines

### Adding, Updating, or Removing External Dependencies

- **Required Files**: The PR **must** include changes to `package.json` and `pnpm-lock.yaml`.
- **Security Review**: Run `pnpm audit` to check for vulnerabilities and address any before merging.
- **Version Verification**: Confirm all new or updated package versions are stable.
- **Breaking Changes**: Document any breaking changes and include migration steps.
- **Testing**: Verify the application builds and all tests pass with the new dependencies.

## Branch Synchronization Strategy

To maintain a clean and linear commit history, this project uses **Rebase** as the preferred strategy for synchronizing feature branches with the `leader` branch.

### Automated Synchronization
The project uses the `Auto-rebase` workflow to automatically rebase all open pull requests whenever new changes are pushed to the `leader` branch. This ensures that PRs are always up-to-date and reduces the likelihood of complex merge conflicts at the end of a feature's development.

**Note**: For the `Auto-rebase` workflow to push to protected branches and trigger subsequent CI checks on the rebased commits, a Personal Access Token (PAT) with `repo` scope must be configured. The workflow is configured to check for the following secrets in order of preference:
1. `PAT_TOKEN` (Primary recommendation)
2. `ARI_PAT` (Supported fallback)
3. `GITHUB_TOKEN` (Default fallback; **Note**: This token cannot trigger subsequent CI checks and may fail on protected branches).

#### Opting Out of Automated Synchronization
If a specific Pull Request or branch should NOT be automatically rebased (e.g., during a complex manual refactor or if history rewriting is undesirable for that branch), apply one of the following labels to the PR:
- `no-rebase`
- `no-update`
- `wip`

The `Auto-rebase` workflow is configured to skip any PR containing these labels.

### Manual Synchronization
Developers can also manually trigger a rebase on a specific pull request by using the `@gemini-update-pr` command in a PR comment.

### Verifying Rebase Logic
To manually verify the rebase workflow for a specific PR without waiting for a push to `leader`:
1. Navigate to the **Actions** tab in GitHub.
2. Select the **Auto-rebase** workflow.
3. Click **Run workflow**.
4. Enter the target **Pull Request number**.
5. Click **Run workflow**.

This is useful for confirming that a specific branch can be rebased successfully or for forcing an update on a stale PR.

### Creating Internal Modules

When creating internal modules that only use built-in APIs or existing dependencies, changes to `package.json` or `pnpm-lock.yaml` are **not** required.
