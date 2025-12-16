# Shared Utility Library

This document provides guidelines for using and extending the shared utility library located in `lib/shared/utils`.

## Purpose and Scope

The purpose of this library is to provide a centralized location for reusable utility functions that can be used across the entire application. This helps to reduce code duplication, improve consistency, and enhance maintainability.

The scope of this library includes any function that is generic enough to be used in multiple, unrelated parts of the codebase. This includes, but is not limited to:

- Date and time formatting
- String manipulation
- Input validation
- API request helpers
- Generic data transformation functions

## Guidelines for Adding New Utilities

Before adding a new utility, please ensure that it meets the following criteria:

1.  **It is a pure function.** The function should not have any side effects and should always return the same output for the same input.
2.  **It is generic and reusable.** The function should not be tied to any specific business logic or component.
3.  **It is well-documented.** The function should have a clear JSDoc comment that explains what it does, what its parameters are, and what it returns.
4.  **It is well-tested.** The function should have comprehensive unit tests that cover all of its functionality.

## How to Use Existing Utilities

To use an existing utility, simply import it from the appropriate file in the `lib/shared/utils` directory. For example, to use the `formatDuration` function, you would add the following import to your file:

```typescript
import { formatDuration } from '@/lib/shared/utils/formatters';
```
