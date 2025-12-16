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

  // Wait functions
  waitForPageReady,

  waitForFontsLoaded,




} from './waits'

// ============================================================================
// Custom Assertions
// ============================================================================
export {
  // Constants


  // Mask helpers
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  // Snapshot assertions


  // Domain-specific assertions




  // API assertions


} from './assertions'

// ============================================================================
// Authentication Utilities
// ============================================================================
export {
  // Constants

  // Auth verification




  // Auth navigation



  // Context management

} from './auth'

// ============================================================================
// Setup and Teardown Utilities
// ============================================================================
export {
  // Constants


  // Warmup and page creation



  // VRT helpers
  replaceIframeWithStableWorkout,

  // Full setup functions




  // Timer utilities



  // Mock utilities


} from './setup'

// ============================================================================
// Re-export Playwright test utilities for convenience
// ============================================================================



// ============================================================================
// Re-export URL utilities
// ============================================================================


// Export BASE_URL for backward compatibility
import { getBaseURL } from '../../../utils/urls'
const BASE_URL = getBaseURL()
