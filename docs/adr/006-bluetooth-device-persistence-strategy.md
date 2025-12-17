# ADR 006: Bluetooth Device Persistence Strategy

## Status

Accepted

## Context

Users were experiencing frustration when a previously saved Bluetooth device was no longer available (e.g., turned off, out of range, or unpaired). The application would attempt to reconnect indefinitely or fail without clear options to recover. Users needed a way to:

1.  Automatically stop trying to connect to a dead device.
2.  Manually "forget" a saved device to switch to a new one.
3.  Have a smoother re-connection flow that doesn't get stuck in a loop.

Previously, the device ID was stored in `localStorage` (or cookies in some iterations) and blindly used for reconnection on page load.

## Decision

We will refine the Bluetooth persistence strategy with the following changes:

1.  **Persistence Mechanism**:
    - We will use `localStorage` to store the `hrm_device_id`.
    - **Justification**: While cookies were previously used, `localStorage` is chosen for simplicity as the device ID is a non-sensitive, client-side-only identifier. The server does not need to know the specific Bluetooth Device ID to function (it receives the data stream via WebSocket). `localStorage` avoids the overhead of cookie management and headers for data that is strictly relevant to the browser's Bluetooth API.

2.  **Automatic Forgetting**:
    - Implement a `maxConnectionAttempts` threshold (default: 3).
    - If automatic reconnection fails `maxConnectionAttempts` times consecutively, the stored ID will be automatically cleared ("forgotten").
    - The user will be notified that the device was forgotten and prompted to select a new one.

3.  **Manual Control**:
    - Expose a "Forget Device" button in the UI when a device is saved but not connected.
    - This allows users to preemptively switch devices without waiting for timeouts.

4.  **Fallback Logic**:
    - If the saved device connection fails, the application will degrade gracefully to the standard "Scanning" / "Request Device" flow, prompting the user to pick a device from the browser's picker.

## Consequences

- **Positive**:
  - Reduces user frustration by preventing infinite reconnection loops.
  - Provides clear feedback when a device is no longer reachable.
  - Simplifies the code by using standard `localStorage` APIs.
- **Negative**:
  - If a user's device is flaky, they might have to re-select it more often if the auto-forget triggers too aggressively. (Mitigated by setting a reasonable attempt limit).
  - Moving away from cookies means we can't easily set expiration policies or `HttpOnly` flags, but these are less relevant for this specific piece of data.
