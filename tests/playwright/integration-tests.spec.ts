// File: tests/playwright/integration-tests.spec.ts
import { expect, test } from './fixtures'
import { BASE_URL, waitForPageReady } from './test-helpers'

test.describe('Integration Tests', () => {
  test('Bluetooth connection flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/connect`)
    await waitForPageReady(page)
    // This is a placeholder for a more complex test that would require mocking the Web Bluetooth API
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible()
    await expect(page).toHaveScreenshot('bluetooth-connect.png')
  })

  test('Multi-device coordination', async ({ browser }) => {
    const context = await browser.newContext()
    const dashboardPage = await context.newPage()
    const controlPage = await context.newPage()

    await dashboardPage.goto(BASE_URL)
    await controlPage.goto(`${BASE_URL}/client/control`)

    await waitForPageReady(dashboardPage)
    await waitForPageReady(controlPage)

    await controlPage.getByTestId('work-duration-input').fill('10')
    await controlPage.click('button:has-text("START")')

    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible({
      timeout: 20000,
    })

    await context.close()
  })

  test('Error state handling', async ({ page }) => {
    // This is a placeholder for a test that would involve mocking a server error
    // For example, by using page.route to intercept a request and return a 500 error
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.route('**/api/some-endpoint', (route) => {
      route.abort()
    })
    // Then, assert that the UI displays an error message
  })
})
