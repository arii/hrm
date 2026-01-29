/**
 * @file This file contains the visual regression tests for the application's critical UI components.
 *
 * The tests in this file are designed to be granular, focusing on individual components
 * in various states. This complements the broader, page-level tests in
 * `visual-regression.spec.ts`.
 */

import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  getDynamicContentMasks,
  getHrMasks,
  setupVisualRegressionTest,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { WAIT_TIMEOUTS, waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let controlPage: Page
let dashboardPage: Page
let mockPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    controlPage = setup.controlPage
    dashboardPage = setup.dashboardPage
    mockPage = setup.mockPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  // Add a beforeEach hook to wait for the page to be ready before each test
  test.beforeEach(async () => {
    await waitForPageReady(controlPage)
    await waitForPageReady(dashboardPage)
  })

  test.describe('TimerControls Component', () => {
    test('initial state', async () => {
      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-idle.png')
    })

    test('with configured inputs', async () => {
      // Ensure Tabata mode is active to see inputs
      await controlPage.getByTestId('tabata-mode-button').click()

      // Use the data-testid to locate the stepper and then find the increase button within it
      const workStepper = controlPage.getByTestId('work-duration-input')
      const increaseWorkButton = workStepper.getByRole('button', {
        name: /Increase/,
      })
      for (let i = 0; i < 5; i++) {
        await increaseWorkButton.click()
      }

      const restStepper = controlPage.getByTestId('rest-duration-input')
      const increaseRestButton = restStepper.getByRole('button', {
        name: /Increase/,
      })
      await increaseRestButton.click()

      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-configured.png')
    })

    test('in active state', async () => {
      await controlPage.getByTestId('start-timer-button').click()
      await expect(controlPage.getByTestId('stop-timer-button')).toBeVisible()

      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-active.png', {
        mask: [controlPage.getByTestId('timer-countdown')],
      })

      // Stop the timer to reset for the next test
      await controlPage.getByTestId('stop-timer-button').click()
    })

    test('start button hover state', async () => {
      const startButton = controlPage.getByTestId('start-timer-button')
      await startButton.hover()
      await takeScreenshot(startButton, 'start-button-hover.png')
    })

    test('in stopwatch mode', async () => {
      await controlPage.getByTestId('stopwatch-mode-button').click()
      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-stopwatch-mode.png')
      // Switch back to Tabata for subsequent tests
      await controlPage.getByTestId('tabata-mode-button').click()
    })
  })

  test.describe('SpotifyControls Component', () => {
    test('initial, logged-out state', async () => {
      const spotifyControls = controlPage.getByTestId('spotify-controls')
      await takeScreenshot(spotifyControls, 'spotify-controls-logged-out.png')
    })

    test('select music button hover state', async () => {
      const selectMusicButton = controlPage.getByRole('button', {
        name: 'Select Music',
      })
      await selectMusicButton.hover()
      await takeScreenshot(selectMusicButton, 'select-music-button-hover.png')
    })
  })

  test.describe('Dashboard Component', () => {
    test('initial, empty state', async () => {
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-empty.png')
    })
  })

  test.describe('ControlPanel Component', () => {
    test('initial state', async () => {
      const controlPanel = controlPage.getByTestId('control-panel')
      await takeScreenshot(controlPanel, 'control-panel.png')
    })
  })

  test.describe('TimerDisplay Component', () => {
    test('active timer', async () => {
      // Configure and start the timer
      const decreaseWorkButton = controlPage.getByRole('button', {
        name: /Decrease Work Duration/i,
      })
      const decreaseRestButton = controlPage.getByRole('button', {
        name: /Decrease Rest Duration/i,
      })
      await decreaseWorkButton.click() // Default 20 -> 15
      await decreaseRestButton.click() // Default 10 -> 5
      await controlPage.click('button:has-text("START")', { force: true })

      // Wait for the control panel to update, indicating the timer has started
      await expect(controlPage.getByTestId('stop-timer-button')).toBeVisible()

      // Wait for the timer state to be visible on the dashboard
      await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
        timeout: WAIT_TIMEOUTS.INFRASTRUCTURE,
      })
      const timerDisplay = dashboardPage.getByTestId('timer-display')

      // Capture the screenshot, masking the dynamic countdown
      await takeScreenshot(timerDisplay, 'timer-display-active.png', {
        mask: [dashboardPage.getByTestId('timer-countdown')],
      })

      // Cleanup: Stop the timer
      await controlPage.getByRole('button', { name: 'STOP' }).click()
    })
  })

  test.describe('MockHRM Client', () => {
    test('form inputs', async () => {
      await mockPage.getByLabel('Weight (kg)').fill('75')
      await mockPage.getByLabel('Height (cm)').fill('180')
      await mockPage.getByLabel('Gender').fill('female')
      const mockClientForm = mockPage.getByTestId('mock-client-form')
      await takeScreenshot(mockClientForm, 'mock-hrm-client-form.png')
    })
  })

  test.describe('HR-Related Components', () => {
    test('dashboard with HR data', async () => {
      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()

      const dashboard = dashboardPage.getByTestId('dashboard')
      await expect(dashboard.locator('text=Mock User')).toBeVisible()

      await takeScreenshot(dashboard, 'dashboard-with-hr-data.png', {
        maxDiffPixelRatio: 0.04,
        mask: [
          ...getDynamicContentMasks(dashboardPage),
          ...getHrMasks(dashboardPage),
        ],
      })
    })

    test('HR tiles section', async () => {
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await mockPage.click('button:has-text("START")')
      await expect(
        mockPage.locator('button:has-text("STOP Streaming")')
      ).toBeVisible()

      const hrTileGrid = dashboardPage.getByTestId('hr-tile-grid')
      await hrTileGrid.waitFor({
        state: 'visible',
        timeout: WAIT_TIMEOUTS.LONG,
      })

      // Isolate the first tile for a more granular screenshot
      const firstTile = hrTileGrid.locator('.MuiGrid-item').first()
      await takeScreenshot(firstTile, 'hr-tile-first.png', {
        maxDiffPixelRatio: 0.05,
        mask: [
          firstTile.locator('[data-testid="live-hr-value"]'),
          firstTile.locator('[data-testid="live-hr-percent"]'),
        ],
      })

      // Stop streaming for subsequent tests
      await mockPage.click('button:has-text("STOP Streaming")')
    })
  })
})
