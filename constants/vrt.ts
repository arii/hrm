/**
 * Constants used specifically for Visual Regression Testing (VRT).
 */

/**
 * The error message used to intentionally trigger the ErrorBoundary for VRT.
 * This is used to verify the ErrorFallback UI without noisy server logs.
 */
export const VRT_TEST_ERROR_MESSAGE = 'VRT Test Error'
