# Development Standards

This document outlines the specific, enforceable standards for development in the HRM project. For a comprehensive overview of the development process, please refer to the [Development Guide](./DEVELOPMENT.md).

## Commit Message Standards

To ensure a clean, readable, and automated changelog, this project enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification. See also the [GitHub Actions Guidelines](./GITHUB_ACTIONS_GUIDELINES.md) for standards on workflow development.

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

### Creating Internal Modules

When creating internal modules that only use built-in APIs or existing dependencies, changes to `package.json` or `pnpm-lock.yaml` are **not** required.
