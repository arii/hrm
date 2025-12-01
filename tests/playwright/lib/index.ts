// File: tests/playwright/lib/index.ts
/**
 * HRM Playwright Test Utilities Library
 *
 * A centralized library containing reusable Playwright test utilities and custom assertion functions.
 * This library encapsulates common testing patterns such as authentication flows, data setup/teardown,
 * specialized waits, and domain-specific assertions.
 *
 * @example
 * ```typescript
 * import {
 *   // Wait utilities
 *   waitForPageReady,
 *   waitForWebSocketConnection,
 *   waitForFontsLoaded,
 *
 *   // Assertions
 *   assertPageSnapshot,
 *   assertTimerState,
 *   getDynamicContentMasks,
 *
 *   // Auth utilities
 *   verifyAuthConfiguration,
 *   navigateToProtectedRoute,
 *
 *   // Setup utilities
 *   setupMinimalVisualRegressionTest,
 *   replaceIframeWithStableWorkout,
 * } from './lib'
 * ```
 */

// ============================================================================
// Wait Utilities
// ============================================================================
export {
  // Constants
  WAIT_TIMEOUTS,
  // Wait functions
  waitForPageReady,
  waitForWebSocketConnection,
  waitForFontsLoaded,
  waitForElementStable,
  waitForNetworkIdle,
  waitForApiResponse,
  waitForAllConditions,
} from './waits'

// ============================================================================
// Custom Assertions
// ============================================================================
export {
  // Constants
  VRT_MASK_SELECTORS,
  DEFAULT_SCREENSHOT_OPTIONS,
  // Mask helpers
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  // Snapshot assertions
  assertPageSnapshot,
  assertElementSnapshot,
  // Domain-specific assertions
  assertTimerState,
  assertWebSocketConnected,
  assertHrDataVisible,
  assertButtonState,
  // API assertions
  assertApiStatus,
  assertApiResponse,
} from './assertions'

// ============================================================================
// Authentication Utilities
// ============================================================================
export {
  // Constants
  AUTH_ENDPOINTS,
  // Auth verification
  verifyAuthConfiguration,
  verifyDebugEndpoints,
  verifyNoStateCookieError,
  verifySpotifyTokenStatus,
  // Auth navigation
  waitForAuthRedirect,
  navigateToProtectedRoute,
  isLoggedIn,
  // Context management
  createAuthenticatedContext,
} from './auth'

// ============================================================================
// Setup and Teardown Utilities
// ============================================================================
export {
  // Constants
  HRM_ROUTES,
  LEGACY_ROUTES,
  // Warmup and page creation
  warmupEndpoints,
  createTestPage,
  navigateAndWait,
  // VRT helpers
  replaceIframeWithStableWorkout,
  prepareForVisualRegression,
  // Full setup functions
  setupVisualRegressionTest,
  setupMinimalVisualRegressionTest,
  setupComprehensiveTest,
  setupCoreTest,
  // Timer utilities
  stopTimer,
  configureTimer,
  startTimer,
  // Mock utilities
  setupMockHrStreaming,
  startMockHrStreaming,
} from './setup'

// ============================================================================
// Re-export Playwright test utilities for convenience
// ============================================================================
export { test, expect } from '@playwright/test'
export type { Page, BrowserContext, Locator } from '@playwright/test'

// ============================================================================
// Re-export URL utilities
// ============================================================================
export { getBaseURL, getWebSocketURL, getAPIURL } from '@/utils/urls'
