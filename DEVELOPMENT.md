# Development Notes

This file contains notes and action items related to the ongoing development of the HRM application.

## Current Workflow

To maintain repository integrity and prevent unverified code from being committed, all developers are required to use the new verified commit process.

- **DO NOT** use `git commit` directly for changes involving source code.
- **DO** use `npm run commit:verified` to ensure your changes are tested and accompanied by a valid `test-proof.json`.

This workflow is enforced by a pre-commit hook. To install it, run the following command from the root of the repository:

`ln -s ../../scripts/pre-commit-hook .git/hooks/pre-commit`

Direct commits that modify source code without updating the proof will be blocked.

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
