# Review Checklist

## Summary
Use this checklist to ensure that the code changes meet the project's quality standards before merging.

## Basic Verification
- [ ] Build completes without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Unit tests pass (`npm run test:unit`)
- [ ] Relevant documentation is updated (e.g., `README.md`, `DEVELOPMENT.md`)

## Code Quality
- [ ] Code is readable, well-structured, and follows the project's style guide
- [ ] No unnecessary or commented-out code
- [ ] Variable and function names are descriptive and meaningful
- [ ] Proper error handling is implemented
- [ ] No sensitive information (secrets, keys) is hardcoded

## Architecture & Patterns
- [ ] Separation of concerns is maintained (e.g., UI, logic, data access)
- [ ] Reusable components are used where appropriate
- [ ] New features follow established architectural patterns (see `DESIGN_GUIDELINES.md`)

## Security
- [ ] Input validation is implemented where necessary
- [ ] Authentication and authorization checks are in place
- [ ] No potential security vulnerabilities introduced (e.g., XSS, SQL injection)
- [ ] Dependencies are up-to-date and free of known vulnerabilities

## Testing
- [ ] New code is covered by unit tests
- [ ] Edge cases and error conditions are tested
- [ ] Integration tests verify the interaction between components (if applicable)

## Functionality
- [ ] The code implements the requested feature or fixes the reported bug
- [ ] No regressions or unexpected side effects are introduced
- [ ] User experience is consistent and intuitive

## Performance
- [ ] No significant performance regressions
- [ ] Efficient algorithms and data structures are used
- [ ] Network requests are optimized (e.g., minimizing payload size, caching)

## Specific Context (Fill in if applicable)
- [ ] Feature: ________________________
- [ ] Bug Fix: ________________________
- [ ] Verification Steps:
    1.
    2.
    3.
