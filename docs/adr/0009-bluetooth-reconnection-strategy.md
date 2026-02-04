# 9. Bluetooth Reconnection Strategy

Date: 2024-05-22

## Status

Accepted

## Context

The Bluetooth Heart Rate Monitor (HRM) integration faced stability issues, particularly with Android devices. Users experienced:
1.  **"Zombie" Connections:** Devices appearing connected but unresponsive after a disconnect, often throwing `NetworkError`, `busy`, or `out of range` errors upon immediate reconnection attempts.
2.  **Unbounded Backoff:** Reconnection attempts could wait excessively long (e.g., >30s) due to uncapped exponential backoff.
3.  **Silent Failures:** Devices would connect but never send data, leaving the UI in a "Connected" state with no heart rate updates.

## Decision

We implemented a robust reconnection strategy in the `useBluetoothHRM` hook with the following components:

### 1. Capped Exponential Backoff
Reconnection attempts use an exponential backoff strategy to reduce congestion, but with a strict cap (`maxReconnectDelayMs`, defaulting to 30s) to ensure the system remains responsive to user intervention.

### 2. "Zombie" Connection Handling
To handle Android-specific "zombie" states where the OS Bluetooth stack hasn't fully cleared the previous connection:
- We detect specific error signatures (`NetworkError`, `busy`, `out of range`).
- We retry the GATT connection up to 3 times with exponential backoff before failing.
- We ensure the delay in this retry loop is also capped by `maxReconnectDelayMs`.

### 3. Post-Connection Staleness Check
We introduced a "grace period" (`POST_CONNECTION_GRACE_PERIOD_MS`, default 5s) immediately after a successful connection. If no data packet is received within this window, we treat the connection as stale and trigger a reconnection. This handles devices that bond but fail to start the notification stream.

## Consequences

### Positive
- Improved reliability on Android devices.
- Faster recovery from transient connection drops.
- Prevention of "fake connected" states where no data is flowing.
- Better user feedback via detailed logging of reconnection attempts.

### Negative
- Increased complexity in the `connectToGatt` logic.
- Potential for slightly longer initial connection times if the first attempt hits a "zombie" error and requires a retry wait.
