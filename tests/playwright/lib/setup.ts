// File: tests/playwright/lib/setup.ts
/**
 * Test Setup and Teardown Utilities
 *
 * This module provides utilities for setting up and tearing down test environments:
 * - Page warmup and preloading
 * - Stable content injection for VRT
 * - Test environment configuration
 */
import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { getBaseURL } from '../../../utils/urls'
import { waitForFontsLoaded, waitForPageReady } from './waits'

/**
 * Common routes used in HRM testing
 */
export const HRM_ROUTES = {
  /** Main dashboard/viewer page */
  DASHBOARD: '/',
  /** Control panel for timer and music */
  CONTROL: '/client/control',
  /** Mock HRM client for testing */
  MOCK: '/client/mock',
  /** Connect page for device pairing */
  CONNECT: '/client/connect',
  /** Debug page for Spotify */
  DEBUG_SPOTIFY: '/debug/spotify',
} as const

/**
 * Legacy routes for backward compatibility
 * @deprecated Use HRM_ROUTES instead for new code
 */
export const LEGACY_ROUTES = {
  /** @deprecated Use HRM_ROUTES.CONTROL instead */
  PHONE: '/phone',
  /** @deprecated Use HRM_ROUTES.MOCK instead */
  MOCK: '/mock',
  /** @deprecated Use HRM_ROUTES.CONNECT instead */
  CONNECT: '/connect',
} as const

