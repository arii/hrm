// File: tests/playwright/lib/setup.ts
/**
 * Test Setup and Teardown Utilities
 *
 * This module provides utilities for setting up and tearing down test environments:
 * - Page warmup and preloading
 * - Stable content injection for VRT
 * - Test environment configuration
 */
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { getBaseURL } from '../../../utils/urls'
import { mockGoogleDocIframe } from './mocks'
import {
  waitForFontsLoaded,
  waitForPageReady,
  waitForWebSocketConnection,
} from './waits'

/**
 * Common routes used in HRM testing
 */
export const HRM_ROUTES = {
  /** Main viewer dashboard */
  DASHBOARD: '/',
  /** Experimental analytics dashboard (primary target for VRTs) */
  EXPERIMENTAL_DASHBOARD: '/client/experimental',
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

/**
 * Warmup server endpoints to ensure fast subsequent requests.
 * Useful for parallel test execution.
 *
 * @param context - The Playwright BrowserContext object
 * @param routes - Optional specific routes to warmup (defaults to all)
 */
export async function warmupEndpoints(
  context: BrowserContext,
  routes: string[] = Object.values(HRM_ROUTES)
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
  } = {}
): Promise<Page> {
  const {
    viewport = { width: 1920, height: 1080 },
    enableConsoleLogging = false,
  } = options

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
export async function navigateAndWait(
  page: Page,
  route: string = ''
): Promise<void> {
  const baseUrl = getBaseURL()
  await page.goto(`${baseUrl}${route}`)
  await waitForPageReady(page)
}

/**
 * Comprehensive setup for visual regression tests.
 * Creates a clean browser context, initializes all required pages,
 * and prepares them for snapshot testing.
 *
 * @param browser - The Playwright Browser fixture
 * @returns An object containing the context and all created pages.
 */
export async function setupVisualRegressionTest(browser: Browser): Promise<{
  context: BrowserContext
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
}> {
  // Create a new isolated browser context for the test suite
  const context = await browser.newContext({
    storageState: undefined, // Ensure no cookies or storage state from previous tests
  })

  // Mock the dynamic Google Doc iframe with static, stable content
  await mockGoogleDocIframe(context)

  // Create all pages in parallel for efficiency
  const [dashboardPage, controlPage, mockPage] = await Promise.all([
    context.newPage(),
    context.newPage(),
    context.newPage(),
  ])

  // Navigate all pages to their respective routes in parallel
  const baseUrl = getBaseURL()
  await Promise.all([
    dashboardPage.goto(`${baseUrl}${HRM_ROUTES.EXPERIMENTAL_DASHBOARD}`),
    controlPage.goto(`${baseUrl}${HRM_ROUTES.CONTROL}`),
    mockPage.goto(`${baseUrl}${HRM_ROUTES.MOCK}`),
  ])

  // Wait for all pages to be fully loaded and idle
  await Promise.all([
    waitForPageReady(dashboardPage),
    waitForPageReady(controlPage),
    waitForPageReady(mockPage),
  ])

  // Wait for WebSocket connections to be established
  await Promise.all([
    waitForWebSocketConnection(dashboardPage),
    waitForWebSocketConnection(controlPage),
    waitForWebSocketConnection(mockPage),
  ])

  // Ensure all custom fonts are loaded to prevent visual shifts
  await Promise.all([
    waitForFontsLoaded(dashboardPage),
    waitForFontsLoaded(controlPage),
    waitForFontsLoaded(mockPage),
  ])

  // Stop any running timers to ensure a consistent initial state
  await stopTimer(controlPage, dashboardPage)

  return { context, dashboardPage, controlPage, mockPage }
}

/**
 * Minimal setup for a single page visual regression test.
 *
 * @param page - The Playwright Page object
 * @param path - Optional path to navigate to
 */
export async function setupMinimalVisualRegressionTest(
  page: Page,
  path: string = ''
): Promise<void> {
  // Mock the iframe for the root path before navigation
  if (path === '' || path === '/') {
    await mockGoogleDocIframe(page)
  }
  await navigateAndWait(page, path)
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

  // Note: Uses LEGACY_ROUTES for control/mock/connect for backward compatibility with existing tests.
  // Dashboard uses HRM_ROUTES.DASHBOARD since it's just '/'.
  await Promise.all([
    dashboardTab.goto(`${baseUrl}${HRM_ROUTES.DASHBOARD}`),
    controlTab.goto(`${baseUrl}${LEGACY_ROUTES.PHONE}`),
    mockTab.goto(`${baseUrl}${LEGACY_ROUTES.MOCK}`),
    connectTab.goto(`${baseUrl}${LEGACY_ROUTES.CONNECT}`),
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

  // Wait for WebSocket connection
  await page.waitForFunction(
    () => {
      return window.__TEST_WEBSOCKET_READY__ === true
    },
    { timeout: 10000 }
  )
}

/**
 * Stop any running timer on the control page.
 * Useful for ensuring tests start from a clean state.
 *
 * @param controlPage - The control panel Page object
 * @param dashboardPage - The dashboard Page object (optional)
 */
export async function stopTimer(
  controlPage: Page,
  dashboardPage?: Page
): Promise<void> {
  const stopButton = controlPage.getByRole('button', {
    name: 'STOP',
    exact: true,
  })

  try {
    // If timer is running, stop it
    if (await stopButton.isVisible({ timeout: 2000 })) {
      await stopButton.click()

      // Wait for START button to confirm timer stopped
      await expect(
        controlPage.getByRole('button', { name: 'START', exact: true })
      ).toBeVisible({ timeout: 5000 })

      // Wait for dashboard to clear timer display if provided
      if (dashboardPage) {
        await expect(dashboardPage.getByTestId('timer-countdown')).toHaveText(
          /00:00/,
          {
            timeout: 5000,
          }
        )
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
  restDuration: number
): Promise<void> {
  // Ensure Tabata mode is active so inputs are visible
  await controlPage.getByTestId('tabata-mode-button').click()

  // Explicitly wait for the work input to become visible after mode change
  await controlPage.waitForSelector('[data-testid="work-duration-input"]', {
    timeout: 5000,
  })

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
  const stopButton = controlPage.getByRole('button', {
    name: 'STOP',
    exact: true,
  })
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
  options: { bpm?: number; zone?: number } = {}
): Promise<void> {
  const { bpm = 155, zone = 4 } = options

  // Get the BPM input element
  const bpmInput = mockPage.getByLabel('Current BPM')

  // Set HR value
  await bpmInput.fill(String(bpm))

  // Set zone
  await mockPage.getByRole('button', { name: `Zone ${zone}` }).click()

  // Verify BPM is set
  await expect(bpmInput).toHaveValue(String(bpm))
}

/**
 * Start mock HR streaming.
 *
 * @param mockPage - The mock client Page object
 */
export async function startMockHrStreaming(mockPage: Page): Promise<void> {
  await mockPage.click('button:has-text("START")')
  await expect(
    mockPage.locator('button:has-text("STOP Streaming")')
  ).toBeVisible()
}

/**
 * Prepare all pages for visual regression testing.
 * Ensures fonts are loaded and pages are stable.
 *
 * @param pages - Array of pages to prepare
 */
export async function prepareForVisualRegression(
  ...pages: Page[]
): Promise<void> {
  await Promise.all(pages.map((page) => waitForFontsLoaded(page)))
}
