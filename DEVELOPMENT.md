# Development Notes

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

## PR Scope Best Practices

To maintain a clean and manageable git history, and to streamline the review process, it is crucial to adhere to the following scope best practices for Pull Requests.

### One Logical Change Per PR

Each PR should address a single, logical change. This makes it easier to review, test, and, if necessary, revert. A single change could be a bug fix, a new feature, or a refactoring effort.

### Separate Refactoring from Features

Architectural changes and refactoring should be done in separate PRs from feature work or bug fixes. This ensures that the review process for architectural changes can be given the dedicated focus it requires.

### Emergency Fixes Stay Focused

Critical patches or emergency fixes should be tightly focused on the issue at hand. Do not include cleanup, refactoring, or other unrelated changes in a hotfix.

### Use Draft PRs for Work-in-Progress

If you are working on a larger feature and want to get early feedback, use a Draft PR. This allows for discussion and review without formally entering the review process.

### When to Split PRs

Consider splitting a PR into multiple smaller PRs in the following scenarios:

- **Changes span multiple architectural layers:** If a change touches the database, the API, and the frontend, it might be better to split it into separate PRs for each layer.
- **A bug fix requires significant refactoring:** Submit the refactoring first, and then the bug fix in a separate PR.
- **Feature work uncovers unrelated issues:** Address the unrelated issue in a separate PR.
- **Multiple reviewers are needed for different aspects of the change:** Smaller, more focused PRs can be assigned to the appropriate reviewers.

## Reviewer Scope Checklist

As a reviewer, it is your responsibility to ensure that PRs adhere to the scope best practices. Use the following checklist to validate the scope of a PR:

- [ ] **PR has a clear, single purpose:** The title and description of the PR should clearly state the purpose of the change.
- [ ] **All changes relate to the stated objective:** The code changes should be directly related to the purpose of the PR.
- [ ] **No unrelated cleanup or refactoring:** The PR should not contain any changes that are not directly related to the stated objective.
- [ ] **Title and description match the actual changes:** The title and description should accurately reflect the changes in the PR.
- [ ] **Tests cover the specific change scope:** The tests should be focused on the changes in the PR and should not include unrelated tests.
