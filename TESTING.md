# Testing Guidelines

This document outlines key strategies and conventions for testing within the HRM dashboard application.

## Web Bluetooth Mocking

The application's Web Bluetooth functionality is tested using a sophisticated mock of the `navigator.bluetooth` API, located in `tests/playwright/lib/bluetooth-mocks.ts`. This mock is essential for running end-to-end tests in a headless CI/CD environment where physical Bluetooth hardware is unavailable.

### Purpose and Design

The mock simulates the entire Web Bluetooth API chain, from device discovery to characteristic notifications. It is designed to be a high-fidelity replacement for the real API, allowing Playwright tests to verify the application's connection, data streaming, and error handling logic without requiring a physical HRM device.

### Long-term Maintenance Strategy

The Web Bluetooth API is a living standard, and browser implementations can change over time. To ensure that our mock remains a reliable testing tool, the following maintenance strategy should be followed:

1.  **Annual Review**: At least once a year, the mock should be reviewed against the latest Web Bluetooth API specification and the implementation in the latest stable version of Google Chrome.
2.  **Deprecation Watch**: When a new version of the Web Bluetooth API is released, a team member should be assigned to review the changes and assess the impact on our mock.
3.  **New Features**: When adding new features to the application that use different aspects of the Web Bluetooth API, the mock should be updated in tandem to support the new functionality.
4.  **Community Contributions**: If a community member reports a discrepancy between the mock and the real API, it should be treated as a bug and prioritized accordingly.

By following these guidelines, we can ensure that our Web Bluetooth tests remain a valuable and accurate measure of the application's functionality.
