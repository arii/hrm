# Network Resilience Strategy

## 1. Overview

This document outlines the strategy and implementation for improving the application's resilience to network interruptions. The primary goal is to provide a more stable and predictable user experience, especially under unstable network conditions, by gracefully handling connectivity changes and providing clear feedback to the user.

## 2. Core Components

The network resilience strategy is built around a few key components that work together to detect, manage, and react to network status changes.

### `ConnectivityProvider`

-   **Location**: `context/ConnectivityContext.tsx`
-   **Purpose**: This is the core of the network awareness system. It acts as a global provider for the application's network status.
-   **Functionality**:
    -   It listens to the browser's native `online` and `offline` events to detect basic connectivity changes.
    -   It implements a more robust, active check by periodically pinging a lightweight API endpoint (`/api/health/network-check`). This helps differentiate between true offline status and limited connectivity scenarios (e.g., captive portals where `navigator.onLine` might be `true`, but internet access is blocked).
    -   It exposes the network status (`online`, `offline`, `limited`) and a simple boolean (`isOnline`) through the `useConnectivity` hook.

### `NetworkStatusBanner`

-   **Location**: `components/NetworkStatusBanner.tsx`
-   **Purpose**: To provide clear, persistent, and non-intrusive feedback to the user about the current network and connection status.
-   **Functionality**:
    -   It consumes both the `ConnectivityContext` and the `WebSocketContext`.
    -   It displays a global banner at the top of the screen with messages tailored to the current state (e.g., "You are offline," "Limited connectivity," "Reconnecting...").
    -   The banner's appearance (color, icon) changes based on the severity of the status (error for offline, warning for limited/reconnecting).
    -   The banner is automatically hidden when connectivity is restored and the application is fully connected.

### `WebSocketProvider`

-   **Location**: `context/WebSocketContext.tsx`
-   **Purpose**: This provider is now enhanced to be network-aware.
-   **Functionality**:
    -   It consumes the `ConnectivityContext` to know the device's network status.
    -   The connection and reconnection logic is now gated by the `isOnline` flag. It will only attempt to establish a WebSocket connection if the `ConnectivityProvider` reports that the network is `online`.
    -   This prevents the WebSocket from attempting futile reconnection loops when the device is known to be offline, saving battery and resources. It automatically attempts to reconnect once the `ConnectivityProvider` signals that the network is back online.

## 3. Developer Guidelines

When building new components or features, developers should consider how they will behave under different network conditions.

### Making a Component Network-Aware

To make a component aware of the network status, you can use the `useConnectivity` hook.

**Example:**

```tsx
import { useConnectivity } from '@/context/ConnectivityContext';

const MyComponent = () => {
  const { isOnline, networkStatus } = useConnectivity();

  const handleSomeAction = () => {
    if (!isOnline) {
      // Optionally, show a specific notification or prevent the action
      console.log("Cannot perform this action while offline.");
      return;
    }
    // ... proceed with the action
  };

  return (
    <div>
      <p>Current network status: {networkStatus}</p>
      <button onClick={handleSomeAction} disabled={!isOnline}>
        Perform Network Action
      </button>
    </div>
  );
};
```

### Best Practices

1.  **Disable Interactive Elements**: For UI elements that trigger server communication (e.g., buttons, forms), use the `isOnline` flag to disable them and provide a tooltip explaining why. This prevents user frustration and invalid application states.
2.  **Avoid Redundant Checks**: The `ConnectivityProvider` handles global network state. Avoid implementing your own network-checking logic within individual components.
3.  **Graceful Degradation**: Design components to fail gracefully. For example, if a component fails to fetch data due to a network issue, it should display a cached version or a clear error message rather than crashing.
4.  **Leverage the Banner**: Rely on the global `NetworkStatusBanner` for general connectivity feedback. Only add component-specific notifications if the context requires a more specific message (e.g., "Could not save your changes due to a network issue.").
