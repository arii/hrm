# Playwright Test Utilities Library

A centralized library containing reusable Playwright test utilities and custom assertion functions for the HRM application.

## Overview

This library encapsulates common testing patterns such as:

- **Authentication flows** - OAuth verification, session management
- **Data setup/teardown** - Page warmup, stable content injection
- **Specialized waits** - Network idle, WebSocket connection, element stability
- **Domain-specific assertions** - Timer state, HR data, visual regression snapshots

## Installation

The library is already included in the project. Simply import from the `lib` folder:

```typescript
import {
  waitForPageReady,
  assertTimerState,
  setupMinimalVisualRegressionTest,
} from './lib'
```

## Modules

### Wait Utilities (`lib/waits.ts`)

Provides deterministic waiting strategies for stable test execution.

```typescript
import {
  waitForPageReady,
  waitForWebSocketConnection,
  waitForFontsLoaded,
  waitForElementStable,
  waitForNetworkIdle,
  waitForApiResponse,
  waitForAllConditions,
  WAIT_TIMEOUTS,
} from './lib'

// Wait for page to be ready
await waitForPageReady(page)

// Wait for WebSocket connection
await waitForWebSocketConnection(page)

// Wait for fonts to load before taking screenshots
await waitForFontsLoaded(page)

// Wait for a specific element to be stable
await waitForElementStable(page, '[data-testid="my-element"]')

// Wait for a specific API response
await waitForApiResponse(page, '/api/data')

// Wait for multiple conditions
await waitForAllConditions(page, [
  () => waitForPageReady(page),
  () => waitForWebSocketConnection(page),
])
```

### Custom Assertions (`lib/assertions.ts`)

Domain-specific assertion functions for HRM testing.

```typescript
import {
  assertPageSnapshot,
  assertElementSnapshot,
  assertTimerState,
  assertWebSocketConnected,
  assertHrDataVisible,
  assertButtonState,
  assertApiStatus,
  assertApiResponse,
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  VRT_MASK_SELECTORS,
  DEFAULT_SCREENSHOT_OPTIONS,
} from './lib'

// Take a page screenshot with standard masking
await assertPageSnapshot(page, 'dashboard.png', {
  mask: getDynamicContentMasks(page),
})

// Assert timer state
await assertTimerState(page, 'WORK')
await assertTimerState(page, 'IDLE')

// Assert WebSocket connection
await assertWebSocketConnected(page)

// Assert HR data is visible for a user
await assertHrDataVisible(page, 'Mock User')

// Assert button state
await assertButtonState(page, 'START', { visible: true, enabled: true })

// Assert API response
assertApiStatus(response, 200)
assertApiResponse(data, { ok: true, status: 'connected' })
```

### Authentication Utilities (`lib/auth.ts`)

Utilities for testing authentication flows.

```typescript
import {
  verifyAuthConfiguration,
  verifyDebugEndpoints,
  verifyNoStateCookieError,
  verifySpotifyTokenStatus,
  waitForAuthRedirect,
  navigateToProtectedRoute,
  isLoggedIn,
  createAuthenticatedContext,
  AUTH_ENDPOINTS,
} from './lib'

// Verify auth configuration
const config = await verifyAuthConfiguration(page)
expect(config.spotifyConfigured).toBe(true)

// Verify debug endpoints
const status = await verifyDebugEndpoints(page)
expect(status.pingOk).toBe(true)

// Check for OAuth errors
await verifyNoStateCookieError(page)

// Navigate to a protected route
await navigateToProtectedRoute(page, '/client/control', {
  expectAuth: true,
})

// Check login status
const loggedIn = await isLoggedIn(page)
```

### Setup Utilities (`lib/setup.ts`)

Test setup and teardown functions.

```typescript
import {
  warmupEndpoints,
  createTestPage,
  navigateAndWait,
  replaceIframeWithStableWorkout,
  prepareForVisualRegression,
  setupVisualRegressionTest,
  setupMinimalVisualRegressionTest,
  setupComprehensiveTest,
  setupCoreTest,
  stopTimer,
  configureTimer,
  startTimer,
  setupMockHrStreaming,
  startMockHrStreaming,
  HRM_ROUTES,
} from './lib'

// Warmup endpoints for faster tests
await warmupEndpoints(context)

// Create a test page with standard settings
const page = await createTestPage(context, {
  viewport: { width: 1920, height: 1080 },
  enableConsoleLogging: true,
})

// Navigate and wait for page ready
await navigateAndWait(page, HRM_ROUTES.CONTROL)

// Setup for visual regression tests
await setupMinimalVisualRegressionTest(page, '/')

// Stop timer before tests
await stopTimer(controlPage, dashboardPage)

// Configure and start timer
await configureTimer(controlPage, 15, 5)
await startTimer(controlPage)

// Setup mock HR streaming
await setupMockHrStreaming(mockPage, { bpm: 155, zone: 4 })
await startMockHrStreaming(mockPage)

// Prepare pages for visual regression
await prepareForVisualRegression(dashboardPage, controlPage, mockPage)
```

## Backward Compatibility

The original `test-helpers.ts` file has been converted to a compatibility layer that re-exports from this library. Existing tests will continue to work without modification.

```typescript
// These imports still work (deprecated)
import { waitForPageReady, BASE_URL } from './test-helpers'

// New recommended import
import { waitForPageReady, getBaseURL } from './lib'
```

## Best Practices

1. **Use the new library** - Import from `./lib` for new tests
2. **Mask dynamic content** - Use `getDynamicContentMasks()`, `getHrMasks()`, or `getTimerMasks()` for VRT
3. **Wait for stability** - Use `waitForPageReady()` before assertions
4. **Wait for WebSocket** - Use `waitForWebSocketConnection()` for real-time tests
5. **Use standard timeouts** - Reference `WAIT_TIMEOUTS` for consistent timeout values

## API Reference

See the TypeScript type definitions in each module for detailed API documentation.
