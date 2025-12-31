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
const HRM_ROUTES = {
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
const LEGACY_ROUTES = {
  /** @deprecated Use HRM_ROUTES.CONTROL instead */
  PHONE: '/phone',
  /** @deprecated Use HRM_ROUTES.MOCK instead */
  MOCK: '/mock',
  /** @deprecated Use HRM_ROUTES.CONNECT instead */
  CONNECT: '/connect',
} as const

/**
 * Navigate to a page and wait for it to be fully ready.
 *
 * @param page - The Playwright Page object
 * @param route - Route to navigate to (or empty string for dashboard)
 */
async function navigateAndWait(
  page: Page,
  route: string = ''
): Promise<void> {
  const baseUrl = getBaseURL()
  await page.goto(`${baseUrl}${route}`)
  await waitForPageReady(page)
}

/**
 * Replace iframe with stable workout content for consistent VRT snapshots.
 * This prevents flaky tests caused by dynamic iframe content.
 *
 * @param page - The Playwright Page object
 */
export async function replaceIframeWithStableWorkout(
  page: Page
): Promise<void> {
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe')
    if (iframe) {
      iframe.src =
        'data:text/html;charset=utf-8,' +
        encodeURIComponent(`
        <!DOCTYPE html>
        <html><head><style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        h3 { margin: 0 0 10px 0; color: #333; }
        p { margin: 5px 0; font-size: 14px; }
        </style></head><body>
        <p><strong>Sample Workout Plan</strong></p>
        <table><tr>
        <td><h3>30/10 x 3</h3><p>3 way crunch</p><p>Dead bug</p><p>Plank variations</p></td>
        <td><h3>Tabata</h3><p>Band h. Bridge</p><p>Band p. Squat</p><p>Band hydrants</p></td>
        <td><h3>Complex 5x5</h3><p>RDL</p><p>High pull</p><p>1 ½ squat</p></td>
        <td><h3>3x10</h3><p>Alt box ch press</p><p>Single Hip thrust</p></td>
        <td><h3>3 x 12</h3><p>Kb curl</p><p>Tricep planks</p><p>Butterfly bridge</p></td>
        </tr></table>
        <p><a href="#">Previous workouts</a></p>
        </body></html>
      `)
    }
  })

  // Wait for the DOM update with the data:text/html iframe
  try {
    await page.waitForSelector('iframe[src^="data:text/html"]', {
      state: 'attached',
      timeout: 2000,
    })
    // Wait for the content to render inside the iframe.
    // "Sample Workout Plan" is a key piece of text in the static HTML
    // and serves as a reliable indicator that the content has fully rendered.
    const iframe = page.frameLocator('iframe')
    await iframe.getByText('Sample Workout Plan').waitFor({ timeout: 2000 })
  } catch {
    console.warn(
      'Warning: Iframe with data:text/html src not found. Iframe may be missing.'
    )
  }
}
