# ADR-0007: Simplified Bluetooth HRM Reconnection Strategy

- Status: Accepted
- Date: 2026-02-18
- Deciders: arii, jules
- Technical Story: #8869

## Context and Problem Statement

The previous Bluetooth HRM reconnection logic was overly complex, utilizing randomized exponential backoff and nested retry loops for handling Android-specific busy states ("Zombie connections"). This added significant cyclomatic complexity to the `useBluetoothHRM` hook and made the connection state machine difficult to maintain and debug.

## Decision Drivers

- Reduce cyclomatic complexity and improve code maintainability.
- Provide a predictable and reliable reconnection window for heart rate monitors.
- Adhere to "Production Readiness" and "Code Conciseness" guidelines.
- Support a clean, single-responsibility connection flow.

## Decision Outcome

Chosen option: "Simplified Linear Backoff with Centralized Retry Logic".

We replaced the randomized exponential math with a clean linear backoff (`RECONNECT_BASE_DELAY_MS * attempt`). To ensure connection stability and maintain a similar patience window to the previous implementation, we increased the default maximum attempts to 8 and the base delay to 2000ms, providing a total 72-second retry window.

Additionally, we removed the internal retry loops from the low-level `connectToGatt` function. Resilience for transient errors (e.g., device busy, NetworkError) is now delegated to the primary reconnection loop, ensuring a consistent state machine.

### Positive Consequences

- Significant reduction in lines of code (~91 lines removed).
- Improved readability and separation of concerns.
- Predictable reconnection timing for better debugging and UX consistency.
- Cleaner state machine without nested asynchronous loops.

### Negative Consequences

- Manual connection attempts do not have immediate internal retries; however, these are handled gracefully by UI error states and user-initiated retries.

## Pros and Cons of the Options

### Simplified Linear Backoff (Chosen)

- Pro: Easy to understand and maintain.
- Pro: Predictable behavior.
- Pro: Predictable 72-second window is sufficient for most HRM recovery scenarios.
- Con: Less "aggressive" than exponential backoff for the first few seconds.

### Randomized Exponential Backoff (Legacy)

- Pro: Standard for high-contention network environments.
- Con: Overly complex for a single point-to-point device connection.
- Con: Hard to predict and test timing accurately.
- Con: Android-specific workarounds added significant technical debt.

## Links

- [PR #8881](https://github.com/arii/hrm/pull/8881)
- [Issue #8869](https://github.com/arii/hrm/issues/8869)
