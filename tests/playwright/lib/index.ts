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
  waitForAllConditions,
  waitForApiResponse,
  waitForElementStable,
  waitForFontsLoaded,
  waitForNetworkIdle,
  // Wait functions
  waitForPageReady,
  waitForWebSocketConnection,
} from './waits'

// ============================================================================
// Custom Assertions
// ============================================================================
export {
  assertApiResponse,
  // API assertions
  assertApiStatus,
  assertButtonState,
  assertElementSnapshot,
  assertHrDataVisible,
  // Snapshot assertions
  assertPageSnapshot,
  // Domain-specific assertions
  assertTimerState,
  assertWebSocketConnected,
  DEFAULT_SCREENSHOT_OPTIONS,
  // Mask helpers
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  // Constants
  VRT_MASK_SELECTORS,
} from './assertions'

// ============================================================================
// Authentication Utilities
// ============================================================================
export {
  // Constants
  AUTH_ENDPOINTS,
  // Context management
  createAuthenticatedContext,
  isLoggedIn,
  navigateToProtectedRoute,
  // Auth verification
  verifyAuthConfiguration,
  verifyDebugEndpoints,
  verifyNoStateCookieError,
  verifySpotifyTokenStatus,
  // Auth navigation
  waitForAuthRedirect,
} from './auth'

// ============================================================================
// Setup and Teardown Utilities
// ============================================================================
export {
  configureTimer,
  createTestPage,
  // Constants
  HRM_ROUTES,
  LEGACY_ROUTES,
  navigateAndWait,
  prepareForVisualRegression,
  // VRT helpers
  replaceIframeWithStableWorkout,
  setupComprehensiveTest,
  setupCoreTest,
  setupMinimalVisualRegressionTest,
  // Mock utilities
  setupMockHrStreaming,
  // Full setup functions
  setupVisualRegressionTest,
  startMockHrStreaming,
  startTimer,
  // Timer utilities
  stopTimer,
  // Warmup and page creation
  warmupEndpoints,
} from './setup'

// ============================================================================
// Re-export Playwright test utilities for convenience
// ============================================================================
export type { BrowserContext, Locator, Page } from '@playwright/test'
export { expect, test } from '@playwright/test'

// ============================================================================
// Re-export URL utilities
// ============================================================================
export { getAPIURL, getBaseURL, getWebSocketURL } from '../../../utils/urls'

// Export BASE_URL for backward compatibility
import { getBaseURL } from '../../../utils/urls'
export const BASE_URL = getBaseURL()
