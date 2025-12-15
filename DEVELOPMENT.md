# Development Notes

> [!NOTE]
> For a comprehensive guide to our coding standards, PR processes, and architectural patterns, please see the new **[Development Standards](./DEVELOPMENT_STANDARDS.md)** document. This file now serves as a high-level overview of ongoing work.

This file contains notes and action items related to the ongoing development of the HRM application.

## Current Focus

The primary focus of ongoing development is to enhance the user experience and improve the long-term maintainability of the application. Key priorities include:

- **UI/UX Polish**: Implementing the enhancements outlined in `FRONTEND_IMPROVEMENT_PLAN.md`, focusing on typography, color consistency, and mobile optimization.
- **Accessibility**: Ensuring the application is fully accessible by meeting WCAG 2.1 AA compliance, including keyboard navigation and screen reader support.
- **Test Suite Optimization**: Consolidating and stabilizing the test suite as described in `TESTING.md` to ensure faster and more reliable CI/CD feedback.
- **Code Quality & Documentation**: Continuously refactoring components for clarity and keeping all development documentation up-to-date.

## Completed Milestones

- **Tabata Timer Refactoring**: The `TabataTimer` service was successfully refactored to support both stopwatch and Tabata modes with a more robust and maintainable architecture.
- **Spotify Controls Overhaul**: The Spotify controls were redesigned and implemented, including volume control, device selection, and improved UI feedback.
- **Bluetooth Connection Flow**: The Bluetooth HRM connection page (`client/connect`) was stabilized and now includes auto-connect functionality.

## Dependency PR Requirements

- **Required Files**: All dependency PRs must include package.json and pnpm-lock.yaml changes
- **Security Review**: Run `npm audit` and document any security vulnerabilities
- **Version Verification**: Confirm all versions are stable (no alpha/beta/rc)
- **Breaking Changes**: Document any breaking changes and migration steps
- **Testing**: Verify application builds and tests pass with new dependencies

## Strict TypeScript Linting Rules

To improve code quality and prevent runtime errors, we have implemented a set of strict ESLint rules for TypeScript. These rules enforce safer coding practices and should be followed in all new code.

- **`@typescript-eslint/ban-ts-comment`**: Prohibits the use of `@ts-ignore`, `@ts-nocheck`, and `@ts-expect-error` comments. These comments hide underlying issues and should be avoided.
- **`@typescript-eslint/no-unnecessary-type-assertion`**: Prevents type assertions that do not change the type of an expression. This helps to eliminate redundant and potentially misleading code.
- **`@typescript-eslint/consistent-type-assertions`**: Enforces a consistent style for type assertions, using `as` for assertions and disallowing them on object literals.
- **`@typescript-eslint/prefer-nullish-coalescing`**: Recommends the use of the nullish coalescing operator (`??`) over logical OR (`||`) for safer handling of falsy values.
- **`@typescript-eslint/no-non-null-assertion`**: Forbids the use of the non-null assertion operator (`!`), which can lead to runtime errors if an expression is unexpectedly `null` or `undefined`.
- **`@typescript-eslint/strict-boolean-expressions`**: Requires that all expressions used in a conditional statement are explicitly boolean. This helps to prevent common errors with truthy and falsy values.
