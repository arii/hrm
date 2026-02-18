# ADR-0007: Consolidated Timer Service and CQRS Removal

## Status

Accepted

## Context

The workout timer implementation was previously fragmented across multiple services (`genericTimer.ts`, `tabataTimer.ts`) and utilized a Command Query Responsibility Segregation (CQRS) pattern (`timerCommands.ts`, `timerQueries.ts`, `timerState.ts`). While CQRS can be beneficial for complex systems, it introduced unnecessary abstraction layers and boilerplate for what is essentially a client-side workout timer.

Additionally, the previous implementation relied on simple `setInterval` increments, which could lead to cumulative timing drift over long durations.

## Decision

We have consolidated all timer logic into a single `TabataTimer` class within `services/tabataTimer.ts`. This service now handles:
- Both TABATA and STOPWATCH modes.
- Phase transitions and state management.
- Sound cue logic.
- Broadcasting updates via a provided callback.

The CQRS pattern and the redundant `genericTimer` abstraction have been removed to reduce complexity and improve maintainability.

The timing mechanism has been refactored to use absolute timing via `Date.now()` and tracked offsets (e.g., `pausedTimeRemaining`). This ensures high accuracy and prevents drift.

## Consequences

- **Pros**:
  - **Reduced Complexity**: Removed approximately 1000 lines of redundant code and boilerplate.
  - **Improved Maintainability**: All timer logic is now in a single, well-documented file.
  - **Higher Accuracy**: Absolute timing eliminates cumulative drift.
  - **Cleaner API**: The service exposes a simple `handleCommand` method and a clear `getState` method.
- **Cons**:
  - **Single Point of Change**: While logic is consolidated, changes to the timer now affect one large class rather than being spread across commands/queries. However, given the scope of the timer, this is preferred.
