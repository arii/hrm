# Architecture Decisions

This document records significant architectural decisions made during the development of the HRM application.

## Client-Side Calorie Computation

**Decision:** The responsibility for real-time calorie calculation has been moved from the server to the client-side, specifically within the `/client/connect` page.

**Reasoning:**

- **Improved Responsiveness:** Calculating calories on the client provides immediate feedback to the user who is actively working out. This avoids the latency of a server round-trip and ensures the user's display is always up-to-date.
- **Reduced Server Load:** Offloading the computational load to the client reduces the server's processing overhead, allowing it to focus on its primary responsibilities of data aggregation and broadcasting.
- **Data Synchronization:** The client sends the calculated calorie count to the server along with the heart rate data. The server then broadcasts this information to all other clients, ensuring that the main dashboard and other displays are synchronized with the user's device.

**Implementation:**

- A new `useCalorieCalculator` hook has been created to encapsulate the calorie calculation logic. This hook uses a Simple Moving Average (SMA) to smooth the heart rate data and a delta-time approach to accurately calculate calorie accumulation.
- The `ConnectPage` component (`app/client/connect/page.tsx`) uses this hook to process the raw heart rate data from the `useBluetoothHRM` hook and sends the calculated calories to the server via a throttled WebSocket message.
- The server-side `socketManager` has been updated to accept the client-calculated calorie value. It also retains a fallback to the old server-side calculation method to ensure backward compatibility with older clients.
- The `HrmConnectionPanel` component on the main dashboard now simply renders the calorie data it receives from the server, without performing any calculations of its own.

## Simplified Bluetooth HRM Reconnection Strategy

**Decision:** The Bluetooth HRM reconnection logic has been simplified from a randomized exponential backoff with nested retry loops to a predictable linear backoff strategy with centralized resilience.

**Reasoning:**

- **Complexity Reduction:** The previous strategy was over-engineered for a point-to-point local device connection. Moving to a linear backoff reduced cyclomatic complexity and code verbosity.
- **Improved Maintainability:** Centralizing retry logic in the primary reconnection loop (rather than having nested retries in the GATT adapter layer) ensures a cleaner state machine and better separation of concerns.
- **Robustness:** By increasing the maximum attempts to 8 and the base delay to 2s, the system provides a robust 72-second window for device recovery, maintaining stability while improving predictability.

**Implementation:**

- See [ADR-0007: Simplified Bluetooth HRM Reconnection Strategy](./adr/0007-simplified-bluetooth-reconnection.md) for full technical details and trade-offs.
