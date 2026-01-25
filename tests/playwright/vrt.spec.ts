/**
 * @file This file contains the visual regression tests for the application's critical UI components.
 *
 * The tests in this file are designed to be granular, focusing on individual components
 * in various states. This complements the broader, page-level tests in
 * `visual-regression.spec.ts`.
 */

import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let controlPage: Page
let dashboardPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    controlPage = setup.controlPage
    dashboardPage = setup.dashboardPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
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
      // The HrmConnectionPanel can sometimes appear due to timing issues,
      // causing VRT flakiness. We hide it to ensure a stable snapshot.
      await dashboardPage.evaluate(() => {
        const panel = document.querySelector(
          '[data-testid="hrm-connection-panel"]'
        )
        if (panel instanceof HTMLElement) {
          panel.style.display = 'none'
        }
      })
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
})
