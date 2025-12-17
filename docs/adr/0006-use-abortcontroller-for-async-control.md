# ADR-0006: Use AbortController for Enhanced Asynchronous Operation Control

- Status: Accepted
- Date: 2024-07-12
- Deciders: Ariel Anders
- Technical Story: [#123](https://github.com/ariel-anders/Type-Safe-React-Dashboard-with-Material-UI-and-Next.js/issues/123)

## Context and Problem Statement

The current `withTimeout` helper effectively manages simple asynchronous timeouts. However, for more complex asynchronous operations, particularly those involving multiple stages or user-initiated cancellations (like Bluetooth connections or lengthy API requests), the native AbortController API offers a more robust and flexible control mechanism. This ADR evaluates `AbortController`'s applicability and determines if it should be adopted for future or existing complex async patterns.

## Decision Drivers

- The need for a standardized, robust way to cancel in-flight asynchronous operations.
- The ability to handle both timeouts and user-initiated cancellations gracefully.
- The desire to align with modern web standards and browser-native APIs.

## Alternatives Considered

- **`withTimeout` helper:** A simple, custom-built timeout utility. It's easy to use for single timeouts but lacks flexibility for more complex scenarios.
- **Third-party libraries (e.g., RxJS):** These libraries offer powerful and flexible ways to manage asynchronous operations, but they also introduce a steep learning curve and additional dependencies.
- **`AbortController`:** A native browser API that provides a standard, flexible way to cancel asynchronous operations.

## Decision Outcome

Chosen option: **`AbortController`**, because it's a native, flexible, and well-supported API that can handle a wide range of asynchronous control scenarios without adding third-party dependencies.

### Positive Consequences

- A standardized approach to cancellable async operations.
- Improved user experience by allowing users to cancel long-running operations.
- Cleaner, more readable code for complex async flows.

### Negative Consequences

- Slightly more boilerplate for simple timeout-only scenarios.
- Requires developers to be familiar with the `AbortController` API and its patterns.

## Pros and Cons of the Options

### `withTimeout` helper

- Pro: Simple and easy to use for basic timeouts.
- Con: Not flexible enough for user-initiated cancellations or multi-stage operations.
- Con: A custom implementation that needs to be maintained.

### Third-party libraries

- Pro: Powerful and flexible for a wide range of async scenarios.
- Con: Introduces additional dependencies and a learning curve.
- Con: May be overkill for the current needs of the application.

### `AbortController`

- Pro: Native browser support, no additional dependencies.
- Pro: Flexible enough to handle both timeouts and user-initiated cancellations.
- Pro: A well-established standard for async control.
- Con: Slightly more verbose for simple cases compared to `withTimeout`.

## Links

- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
