# Shared Utility Library

This directory contains a collection of common, reusable utility functions that are shared across the entire application (frontend, backend, and other shared modules).

## Purpose

The primary goal of this library is to:

- **Reduce Code Duplication**: By centralizing frequently used functions, we avoid scattering duplicate logic across the codebase.
- **Improve Consistency**: A single source of truth for common operations ensures that they behave consistently everywhere.
- **Enhance Maintainability**: Bugs can be fixed in one place, and improvements benefit all parts of the application that use these utilities.
- **Increase Reusability**: Well-defined, pure utility functions are easier to reuse in new contexts.

## Guidelines for Contribution

To maintain the quality and integrity of this shared library, please adhere to the following guidelines when adding new utilities:

1.  **Pure Functions Only**: Utilities in this library must be pure functions. This means they should:
    -   Always produce the same output for the same input.
    -   Have no side effects (e.g., no API calls, no modifying global state, no writing to disk).

2.  **Single Responsibility**: Each function should do one thing and do it well. Avoid creating monolithic functions that handle multiple, unrelated tasks.

3.  **Well-Typed**: All functions must be strongly typed using TypeScript. Use clear and descriptive type definitions for all parameters and return values.

4.  **Comprehensive TSDoc**: Every exported function must have a TSDoc comment that explains:
    -   Its purpose.
    -   Each of its parameters (`@param`).
    -   Its return value (`@returns`).
    -   A simple usage example (`@example`).

5.  **Named Exports**: Use named exports exclusively. Do not use default exports, as this promotes consistency in how modules are imported.

    ```typescript
    // Good
    export const newUtility = () => { /* ... */ };

    // Bad
    const newUtility = () => { /* ... */ };
    export default newUtility;
    ```

6.  **Unit Tests**: Every utility function must be accompanied by a comprehensive set of unit tests. Tests should cover:
    -   Happy path scenarios.
    -   Edge cases (e.g., `null`, `undefined`, empty inputs).
    -   Invalid inputs and error handling.

## Directory Structure

Organize utilities into logical files based on their domain. For example:

-   `lib/shared/utils/date.ts`: Functions for date manipulation.
-   `lib/shared/utils/string.ts`: Functions for string formatting and manipulation.
-   `lib/shared/utils/object.ts`: Functions for object manipulation.
