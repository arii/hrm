// File: tests/playwright/test-helpers.ts
/**
 * Shared Test Helpers: Backward Compatibility Layer
 *
 * @deprecated This file is maintained for backward compatibility.
 * For new code, import directly from '@/tests/playwright/lib' instead:
 *
 * @example
 * ```typescript
 * import {
 *   waitForPageReady,
 *   waitForFontsLoaded,
 *   getDynamicContentMasks,
 *   setupVisualRegressionTest,
 * } from '@/tests/playwright/lib'
 * ```
 */
import { getBaseURL } from '@/utils/urls'

// Re-export all utilities from the new library for backward compatibility
export {
  // Wait utilities
  waitForPageReady,
  waitForFontsLoaded,
  waitForWebSocketConnection,
  // Mask selectors and helpers
  VRT_MASK_SELECTORS,
  getDynamicContentMasks,
  getHrMasks,
  getTimerMasks,
  // Setup utilities
  setupVisualRegressionTest,
  setupMinimalVisualRegressionTest,
  setupComprehensiveTest,
  setupCoreTest,
<<<<<<< HEAD
} from '@/tests/playwright/lib'
=======
  // Mock utilities
  mockGoogleDocIframe,
  mockMultipleHrDevices,
  mockSpotifyPlaybackState,
  mockLoggedInSession,
} from './lib'
>>>>>>> origin/leader

// Export BASE_URL for backward compatibility
export const BASE_URL = getBaseURL()
