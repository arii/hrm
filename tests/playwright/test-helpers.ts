// File: tests/playwright/test-helpers.ts
/**
 * Shared Test Helpers: Backward Compatibility Layer
 *
 * @deprecated This file is maintained for backward compatibility.
 * For new code, import directly from './lib' instead:
 *
 * @example
 * ```typescript
 * import {
 *   waitForPageReady,
 *   waitForFontsLoaded,
 *   getDynamicContentMasks,
 *   setupVisualRegressionTest,
 * } from './lib'
 * ```
 */
import { getBaseURL } from '../../utils/urls'

// Re-export all utilities from the new library for backward compatibility
export {
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  // Setup utilities
  replaceIframeWithStableWorkout,
  setupComprehensiveTest,
  setupCoreTest,
  setupMinimalVisualRegressionTest,
  setupVisualRegressionTest,
  // Mask selectors and helpers
  VRT_MASK_SELECTORS,
  waitForFontsLoaded,
  // Wait utilities
  waitForPageReady,
  waitForWebSocketConnection,
} from './lib'

// Export BASE_URL for backward compatibility
export const BASE_URL = getBaseURL()
