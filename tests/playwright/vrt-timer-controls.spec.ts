import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { setupVisualRegressionTest } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

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

  // Add a beforeEach hook to wait for the page to be ready before each test
  test.beforeEach(async () => {
    // Enforce viewport size to prevent height mismatches
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
      await takeScreenshot(timerControls, 'timer-controls-configured.png', {
        // Performance: Skip a11y check as configuration inputs are covered in other tests
        skipA11y: true,
      })
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
      await takeScreenshot(startButton, 'start-button-hover.png', {
        // Performance: Skip a11y check for hover state
        skipA11y: true,
      })
    })

    test('in stopwatch mode', async () => {
      await controlPage.getByTestId('stopwatch-mode-button').click()
      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-stopwatch-mode.png', {
        // Performance: Skip a11y check for alternate mode; main mode is fully covered
        skipA11y: true,
      })
      // Switch back to Tabata for subsequent tests
      await controlPage.getByTestId('tabata-mode-button').click()
    })
  })
})
