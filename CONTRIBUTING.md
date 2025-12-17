# Contributing to HRM

Thank you for your interest in contributing to the HRM (Heart Rate Monitor) project! This document provides guidelines and instructions for contributing to this project.

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/arii/hrm.git
   cd hrm
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   pnpm run dev
   ```

## Code Style and Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow naming conventions (camelCase for variables, PascalCase for components)

### React Components

- Use functional components with hooks
- Prefer named exports over default exports for components
- Keep components small and focused
- Use TypeScript for prop types

### Code Formatting

- We use Prettier for code formatting
- ESLint for code linting
- Run `pnpm run format` before committing
- Run `pnpm run lint:fix` to fix linting issues

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch

# Run visual regression tests
pnpm run test:visual
```

### Writing Tests

- Write unit tests for utilities and hooks
- Write integration tests for components
- Aim for 70%+ code coverage
- Use Testing Library best practices
- Mock external dependencies appropriately

## Commit Message Format

We use [Conventional Commits](https://conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples:

```
feat(timer): add pause functionality to Tabata timer
fix(websocket): resolve connection drop on network change
docs: update API documentation for WebSocket events
test: add unit tests for timer utilities
```

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   pnpm run lint
   pnpm run test:coverage
   pnpm run build
   pnpm run test:visual
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: your descriptive commit message"
   ```

5. **Push to your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use the PR template
   - Provide clear description of changes
   - Link related issues
   - Request appropriate reviewers

### Dependency Updates

- For pull requests that update dependencies, please use the specific `dependency.md` template.
- Ensure you follow the guidelines outlined in the `DEVELOPMENT.md` file under the "Dependency PR Requirements" section.

## Troubleshooting CI/CD Issues

Our CI/CD pipeline includes automated checks to ensure code quality and consistency. Here are some common issues you might encounter:

### Lockfile Mismatch

- **Error Message**: `ERR_PNPM_OUTDATED_LOCKFILE`
- **Cause**: This happens when you make changes to `package.json` (e.g., adding, removing, or updating a dependency) but do not commit the corresponding changes to `pnpm-lock.yaml`.
- **Solution**: Run the following commands locally, then commit and push the updated lockfile:
  ```bash
  pnpm install
  git add pnpm-lock.yaml
  git commit -m "fix: update pnpm lockfile"
  git push
  ```

### Dependency Installation Failure

- **Symptom**: The "Install Dependencies" step fails for reasons other than a lockfile mismatch.
- **Cause**: This can be due to a syntax error in `package.json`, an invalid or unreachable dependency, or a corrupted `pnpm-lock.yaml` file.
- **Solution**:
  1.  Carefully check your `package.json` for any syntax errors (e.g., missing commas, incorrect version specifiers).
  2.  Ensure all specified dependencies are valid and available on the npm registry.
  3.  Review the workflow logs for the specific error message from `pnpm`.

## Code Review Process

- All changes require review before merging
- Address all review feedback
- Ensure CI checks pass
- Maintain code coverage thresholds
- Update documentation for user-facing changes

## Issue Reporting

### Bug Reports

- Use the bug report template
- Provide clear reproduction steps
- Include environment details
- Attach screenshots if applicable

### Feature Requests

- Use the feature request template
- Explain the problem being solved
- Describe proposed solution
- Consider implementation complexity

## Release Process

1. **Version Bumping**
   - Follow semantic versioning (semver)
   - Update CHANGELOG.md
   - Update package.json version

2. **Testing**
   - Ensure all tests pass
   - Run full regression testing
   - Verify deployment builds

3. **Documentation**
   - Update README if needed
   - Update API documentation
   - Update migration guides

## Getting Help

- Join our development discussions in issues
- Ask questions in pull request comments
- Review existing documentation and issues first

## Code of Conduct

- Be respectful and inclusive
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

## Development Tools

### Recommended VS Code Extensions

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (for API testing)

### Git Workflow

- Use descriptive branch names
- Rebase feature branches before merging
- Keep commits atomic and focused
- Write meaningful commit messages

Thank you for contributing to HRM! 🎉
