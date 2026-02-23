'use client'

import { VRT_TEST_ERROR_MESSAGE } from '@/constants/vrt'

/**
 * A component that always throws an error during its render phase.
 * Used exclusively for Visual Regression Testing (VRT) to verify the ErrorBoundary.
 */
export default function TestErrorTrigger() {
  throw new Error(VRT_TEST_ERROR_MESSAGE)
}
