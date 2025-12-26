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

## Future Plans (Long Term)

- Integrate guidelines into the CI/CD pipeline.
- Create development setup scripts that enforce standards.
- Build custom linting rules for project-specific patterns.
