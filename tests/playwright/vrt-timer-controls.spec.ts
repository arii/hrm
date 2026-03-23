import { expect, test } from './fixtures'
import { setupMinimalVisualRegressionTest, HRM_ROUTES } from './lib'
import { takeScreenshot } from './lib/visual'

// Test suite for VRT
test.describe('TimerControls Visual Regression Tests', () => {
  test.describe('TimerControls Component', () => {
    test('initial state', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-idle.png')
    })

    test('with configured inputs', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
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

    test('in active state', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
      await controlPage.getByTestId('start-timer-button').click()
      await expect(controlPage.getByTestId('stop-timer-button')).toBeVisible()

      const timerControls = controlPage.getByTestId('timer-controls')
      await takeScreenshot(timerControls, 'timer-controls-active.png', {
        mask: [controlPage.getByTestId('timer-countdown')],
      })

      // Stop the timer to reset for the next test
      await controlPage.getByTestId('stop-timer-button').click()
    })

    test('start button hover state', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
      const startButton = controlPage.getByTestId('start-timer-button')
      await startButton.hover()
      await takeScreenshot(startButton, 'start-button-hover.png', {
        // Performance: Skip a11y check for hover state
        skipA11y: true,
      })
    })

    test('in stopwatch mode', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
      await controlPage.getByTestId('stopwatch-mode-button').click()
      // In stopwatch mode the tabata-specific inputs are hidden
      await expect(controlPage.getByTestId('work-duration-input')).toBeHidden()
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
