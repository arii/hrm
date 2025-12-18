# Development Checklist

This checklist ensures that your pull request is complete and ready for review. Before submitting, please verify that you have completed all of the following steps.

## 1. Code Quality & Standards

- [ ] **Linting**: Your code passes all linting rules. Run `pnpm run lint` to verify.
- [ ] **Formatting**: Your code is formatted correctly. Run `pnpm run format` to verify.
- [ ] **Conventional Commits**: Your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- [ ] **Knip**: You have run `pnpm run knip` and there are no new unused files, dependencies, or exports.

## 2. Testing

- [ ] **Unit & Integration Tests**: You have added or updated tests to cover your changes.
- [ ] **Test Execution**: All tests pass locally. Run `pnpm test` to verify.
- [ ] **Test Coverage**: Your changes maintain or increase the project's test coverage. The current minimum is 70%. Run `pnpm run test:coverage` to verify.
- [ ] **Visual Regression Tests**: If your changes affect the UI, you have run and passed the visual regression tests. Run `pnpm run test:visual` to verify.

## 3. Dependencies

- [ ] **Security Audit**: If you have added or updated dependencies, you have run `pnpm audit` and there are no new high or critical severity vulnerabilities.
- [ ] **Lockfile**: If you have changed `package.json`, you have included the updated `pnpm-lock.yaml` in your commit.

## 4. Documentation

- [ ] **PR Template**: You have filled out the pull request template with all the necessary details.
- [ ] **Code Comments**: You have added comments to your code, particularly in hard-to-understand areas.
- [ ] **Project Documentation**: You have updated any relevant documentation (e.g., `README.md`, `DEVELOPMENT.md`) to reflect your changes.

## 5. Self-Review

- [ ] **Self-Review**: You have performed a thorough self-review of your own code to catch any potential issues before requesting a review.
- [ ] **Build**: The application builds successfully. Run `pnpm run build` to verify.
