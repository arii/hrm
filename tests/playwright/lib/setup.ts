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
 * Warmup server endpoints to ensure fast subsequent requests.
 * Useful for parallel test execution.
 *
 * @param context - The Playwright BrowserContext object
 * @param routes - Optional specific routes to warmup (defaults to all)
 */
export async function warmupEndpoints(
  context: BrowserContext,
  routes: string[] = Object.values(HRM_ROUTES),
): Promise<void> {
  const baseUrl = getBaseURL()
  const warmupPage = await context.newPage()

  console.log('🔥 Warming up server endpoints...')

  for (const route of routes) {
    await warmupPage.goto(`${baseUrl}${route}`)
    await waitForPageReady(warmupPage)
  }

  await warmupPage.close()
  console.log('✅ Server endpoints warmed up')
}

/**
 * Create and configure a page with standard settings for testing.
 *
 * @param context - The Playwright BrowserContext object
 * @param options - Optional configuration
 * @returns Configured Page object
 */
export async function createTestPage(
  context: BrowserContext,
  options: {
    viewport?: { width: number; height: number }
    enableConsoleLogging?: boolean
  } = {},
): Promise<Page> {
  const { viewport = { width: 1920, height: 1080 }, enableConsoleLogging = false } = options

  const page = await context.newPage()
  await page.setViewportSize(viewport)

  if (enableConsoleLogging) {
    page.on('console', (msg) => {
      if (!msg.text().includes('DOCS_timing')) {
        console.log(`Console ${msg.type()}: ${msg.text()}`)
      }
    })
  }

  return page
}

/**
 * Navigate to a page and wait for it to be fully ready.
 *
 * @param page - The Playwright Page object
 * @param route - Route to navigate to (or empty string for dashboard)
 */
export async function navigateAndWait(page: Page, route: string = ''): Promise<void> {
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
export async function replaceIframeWithStableWorkout(page: Page): Promise<void> {
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
  } catch {
    console.warn('Warning: Iframe with data:text/html src not found. Iframe may be missing.')
  }
}

/**
 * Setup function for visual regression tests.
 * Navigates to all pages and waits for ready signals.
 *
 * @param pages - Object containing all page instances
 */
export async function setupVisualRegressionTest(pages: {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}): Promise<void> {
  const { dashboardPage, controlPage, mockPage, connectPage } = pages
  const baseUrl = getBaseURL()

  // Navigate all pages in parallel
  await Promise.all([
    dashboardPage.goto(baseUrl),
    controlPage.goto(`${baseUrl}/phone`),
    mockPage.goto(`${baseUrl}/mock`),
    connectPage.goto(`${baseUrl}/connect`),
  ])

  // Wait for all pages to signal ready
  await Promise.all([
    waitForPageReady(dashboardPage),
    waitForPageReady(controlPage),
    waitForPageReady(mockPage),
    waitForPageReady(connectPage),
  ])

  // Replace iframe with stable content for dashboard
  await replaceIframeWithStableWorkout(dashboardPage)
}

/**
 * Minimal setup for a single page visual regression test.
 *
 * @param page - The Playwright Page object
 * @param path - Optional path to navigate to
 */
export async function setupMinimalVisualRegressionTest(
  page: Page,
  path: string = '',
): Promise<void> {
  await navigateAndWait(page, path)
  if (path === '' || path === '/') {
    await replaceIframeWithStableWorkout(page)
  }
}

/**
 * Setup function for comprehensive end-to-end tests.
 * Pre-warms all endpoints and configures the test environment.
 *
 * @param options - Configuration options
 */
export async function setupComprehensiveTest(options: {
  page: Page
  context: BrowserContext
}): Promise<void> {
  const { page, context } = options
  const baseUrl = getBaseURL()

  await page.setViewportSize({ width: 1920, height: 1080 })

  // Pre-warm all endpoints for comprehensive tests
  const dashboardTab = await context.newPage()
  const controlTab = await context.newPage()
  const mockTab = await context.newPage()
  const connectTab = await context.newPage()

  await Promise.all([
    dashboardTab.goto(baseUrl),
    controlTab.goto(`${baseUrl}/phone`),
    mockTab.goto(`${baseUrl}/mock`),
    connectTab.goto(`${baseUrl}/connect`),
  ])

  await Promise.all([
    waitForPageReady(dashboardTab),
    waitForPageReady(controlTab),
    waitForPageReady(mockTab),
    waitForPageReady(connectTab),
  ])

  // Close pre-warm tabs but keep connections alive
  await dashboardTab.close()
  await controlTab.close()
  await mockTab.close()
  await connectTab.close()
}

/**
 * Setup function for core functionality tests.
 *
 * @param options - Configuration options
 */
export async function setupCoreTest(options: { page: Page }): Promise<void> {
  const { page } = options

  await waitForPageReady(page)
  await replaceIframeWithStableWorkout(page)

  // Wait for WebSocket connection
  await page.waitForFunction(
    () => {
      return window.__TEST_WEBSOCKET_READY__ === true
    },
    { timeout: 10000 },
  )
}

/**
 * Stop any running timer on the control page.
 * Useful for ensuring tests start from a clean state.
 *
 * @param controlPage - The control panel Page object
 * @param dashboardPage - The dashboard Page object (optional)
 */
export async function stopTimer(controlPage: Page, dashboardPage?: Page): Promise<void> {
  const stopButton = controlPage.getByRole('button', { name: 'STOP', exact: true })

  try {
    // If timer is running, stop it
    if (await stopButton.isVisible({ timeout: 2000 })) {
      await stopButton.click()

      // Wait for START button to confirm timer stopped
      await expect(
        controlPage.getByRole('button', { name: 'START', exact: true }),
      ).toBeVisible({ timeout: 5000 })

      // Wait for dashboard to clear timer display if provided
      if (dashboardPage) {
        await expect(dashboardPage.locator('text=00:00')).toBeVisible({ timeout: 5000 })
      }
    }
  } catch (error) {
    console.warn('Timer check/stop encountered an issue (ignoring):', error)
  }
}

/**
 * Configure timer settings on the control page.
 *
 * @param controlPage - The control panel Page object
 * @param workDuration - Work interval duration in seconds
 * @param restDuration - Rest interval duration in seconds
 */
export async function configureTimer(
  controlPage: Page,
  workDuration: number,
  restDuration: number,
): Promise<void> {
  const workInput = controlPage.getByTestId('work-duration-input')
  const restInput = controlPage.getByTestId('rest-duration-input')

  await expect(workInput).toBeVisible({ timeout: 5000 })
  await expect(restInput).toBeVisible({ timeout: 5000 })

  await workInput.fill(String(workDuration))
  await restInput.fill(String(restDuration))
}

/**
 * Start the timer on the control page.
 *
 * @param controlPage - The control panel Page object
 */
export async function startTimer(controlPage: Page): Promise<void> {
  await controlPage.click('button:has-text("START")', { force: true })

  // Verify timer started
  const stopButton = controlPage.getByRole('button', { name: 'STOP', exact: true })
  await expect(stopButton).toBeVisible()
}

/**
 * Setup mock HR streaming on the mock page.
 *
 * @param mockPage - The mock client Page object
 * @param options - Configuration options
 */
export async function setupMockHrStreaming(
  mockPage: Page,
  options: { bpm?: number; zone?: number } = {},
): Promise<void> {
  const { bpm = 155, zone = 4 } = options

  // Set HR value
  await mockPage.getByLabel('Current BPM').fill(String(bpm))

  // Set zone
  await mockPage.getByRole('button', { name: `Zone ${zone}` }).click()

  // Verify BPM is set
  await expect(mockPage.getByLabel('Current BPM')).toHaveValue(String(bpm))
}

/**
 * Start mock HR streaming.
 *
 * @param mockPage - The mock client Page object
 */
export async function startMockHrStreaming(mockPage: Page): Promise<void> {
  await mockPage.click('button:has-text("START")')
  await expect(mockPage.locator('button:has-text("STOP Streaming")')).toBeVisible()
}

/**
 * Prepare all pages for visual regression testing.
 * Ensures fonts are loaded and pages are stable.
 *
 * @param pages - Array of pages to prepare
 */
export async function prepareForVisualRegression(...pages: Page[]): Promise<void> {
  await Promise.all(pages.map((page) => waitForFontsLoaded(page)))
}
