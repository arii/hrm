# Core Utility Library

## Purpose

This directory contains the core shared utility library for the application. The purpose of this library is to centralize common, reusable functionalities, thereby improving code consistency, reusability, and maintainability across the entire application.

## Guidelines for Use

- **Single Responsibility:** Each function should adhere to a clear single responsibility principle.
- **Purity:** Utility functions should be pure, meaning they have no unintended side effects.
- **Typing:** All functions should be well-typed using TypeScript.
- **Documentation:** All functions must have comprehensive TSDoc comments, describing its purpose, parameters, return values, and usage examples.
- **Testing:** All new or modified functions must have corresponding unit tests.

## Adding New Utilities

When adding a new utility function, please adhere to the following structure:

1.  **Identify the correct file:** Place the new function in the file that best represents its logical grouping (e.g., `date.ts`, `json.ts`, `time.ts`). If a suitable file does not exist, create a new one.
2.  **Add the function:** Ensure the function follows the guidelines listed above.
3.  **Add unit tests:** Create or update a test file in `tests/unit/lib/core/` to ensure the correctness of the new function.
4.  **Update this README:** If a new file is created, add it to the list of modules below.

## Modules

-   **`date.ts`**: Functions for handling dates and timestamps.
-   **`json.ts`**: Functions for handling JSON data.
-   **`time.ts`**: Functions for handling time and durations.
