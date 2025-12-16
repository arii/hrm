# 6. Bluetooth Device Persistence Strategy

* Status: accepted
* Date: 2024-07-26

## Context and Problem Statement

The application persists the Bluetooth device ID in a cookie to facilitate automatic reconnection. This is convenient, but can lead to a poor user experience if the stored device is unavailable (e.g., out of range, turned off, or forgotten by the OS). This can result in repeated failed connection attempts without any recourse for the user.

## Decision Drivers

* Improve the user experience when a saved Bluetooth device is unavailable.
* Provide users with more control over their saved devices.
* Prevent the application from getting stuck in a loop of failed reconnection attempts.

## Considered Options

1. **No changes:** Keep the existing implementation. This was rejected as it provides a poor user experience.
2. **Implement a robust connection fallback mechanism:** This option involves automatically clearing the saved device ID after a certain number of failed connection attempts, providing a "Forget Device" button for the user, and falling back to the device selection prompt if the saved device is unavailable.

## Decision Outcome

Chosen option: "Implement a robust connection fallback mechanism", because it addresses all of the decision drivers.

### Positive Consequences

* The application will no longer get stuck in a loop of failed reconnection attempts.
* Users will have more control over their saved devices.
* The user experience will be improved when a saved Bluetooth device is unavailable.

### Negative Consequences

* The implementation is more complex than the existing solution.
