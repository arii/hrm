import { test, expect } from '@playwright/test'

test.describe('Tabata Timer', () => {
  test('should transition through PREPARE, WORK, and REST states', async ({
    page,
    context,
  }) => {
    await page.clock.install({ time: new Date() })

    await page.goto('/')

    // Wait for the main container to be visible
    await page.waitForSelector('[data-testid="timer-display-container"]')

    // Open a new page for the control panel
    const controlPage = await context.newPage()
    await controlPage.goto('/client/control')

    // Start the timer from the control panel
    await controlPage.getByRole('button', { name: 'Start' }).click()

    // The timer should now be in the PREPARE state
    await expect(
      page.locator('[data-testid="timer-display-container"]')
    ).toHaveAttribute('data-timer-phase', 'PREPARE')
    await expect(page.getByTestId('timer-countdown')).toHaveText('10')

    // Fast-forward time by 10 seconds to move to the WORK phase
    await page.clock.fastForward(10000)

    // The timer should now be in the WORK state
    await expect(
      page.locator('[data-testid="timer-display-container"]')
    ).toHaveAttribute('data-timer-phase', 'WORK')
    await expect(page.getByTestId('timer-countdown')).toHaveText('00:20')

    // Fast-forward time by 20 seconds to move to the REST phase
    await page.clock.fastForward(20000)

    // The timer should now be in the REST state
    await expect(
      page.locator('[data-testid="timer-display-container"]')
    ).toHaveAttribute('data-timer-phase', 'REST')
    await expect(page.getByTestId('timer-countdown')).toHaveText('00:10')
  })
})
