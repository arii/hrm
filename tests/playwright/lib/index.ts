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
 * } from '@/tests/playwright/lib/lib'
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
} from '@/tests/playwright/lib/waits'

// ============================================================================
// Custom Assertions
// ============================================================================
export {
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
} from '@/tests/playwright/lib/assertions'

// ============================================================================
// Masking Utilities
// ============================================================================
export {
  // Constants
  VRT_MASK_SELECTORS,
  // Mask helpers
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
} from '@/tests/playwright/lib/masks'

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
} from '@/tests/playwright/lib/auth'

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
} from '@/tests/playwright/lib/setup'

// ============================================================================
// Visual Testing Utilities
// ============================================================================
export {
  // Constants
  SCREENSHOT_OPTIONS,
  // Screenshot helpers
  takeScreenshot,
  takeDashboardScreenshot,
  prepareForVisualRegression,
} from '@/tests/playwright/lib/visual'

// ============================================================================
// Re-export Playwright test utilities for convenience
// ============================================================================
export { test, expect } from '@playwright/test'
export type { Page, BrowserContext, Locator } from '@playwright/test'

// ============================================================================
// Re-export URL utilities
// ============================================================================
export { getBaseURL, getWebSocketURL, getAPIURL } from '@/utils/urls'

// Export BASE_URL for backward compatibility
import { getBaseURL } from '@/utils/urls'
export const BASE_URL = getBaseURL()
