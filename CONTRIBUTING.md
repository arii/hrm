# Contributing to HRM Dashboard

We welcome contributions to the HRM Dashboard! Please follow these guidelines to ensure a smooth development process.

## Code Style

- **Formatting**: This project uses Prettier for code formatting. Please run `pnpm run format` before submitting a pull request.
- **Linting**: We use ESLint for static analysis. Run `pnpm run lint` to check for any issues.

## Commit Messages

Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for your commit messages.

## Pull Request Process

1.  Fork the repository and create your branch from `leader`.
2.  Make your changes and ensure all tests pass (`pnpm test`).
3.  Submit a pull request with a clear description of your changes.

## Pre-commit Hooks

This project uses `husky` and `lint-staged` to automatically format and lint your code before you commit. This helps to ensure that all code in the repository is consistent and of high quality.

When you run `git commit`, the pre-commit hook will:

1.  Run `eslint --fix` on all staged `.js`, `.jsx`, `.ts`, and `.tsx` files.
2.  Run `prettier --write` on all staged `.js`, `.jsx`, `.ts`, and `.tsx` files.

If there are any linting or formatting errors, the commit will be aborted. You will need to fix the errors and then run `git commit` again.
