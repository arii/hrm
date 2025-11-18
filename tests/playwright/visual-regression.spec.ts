// File: tests/playwright/visual-regression.spec.ts
/**
 * Visual Regression Tests: Capture screenshots of key pages to verify visual parity
 * with the original HRM site design. Run these tests after layout changes to detect
 * unexpected visual regressions.
 */
import { expect, test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  setupVisualRegressionTest,
} from './test-helpers'

test.describe('Visual Regression Tests', () => {
  test('Dashboard - main viewer page', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage)
    // Capture full-page screenshot
    await expect(dashboardPage).toHaveScreenshot('dashboard-viewer.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide', // Hide text cursor
      threshold: 0.2, // Allow for minor rendering differences
    })
  })

  test.beforeEach(setupVisualRegressionTest)

  test('Control Panel - timer and music controls', async ({ controlPage }) => {
    // Capture screenshot
    await expect(controlPage).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('Mock HRM Client - test data input', async ({ mockPage }) => {
    // Capture screenshot
    await expect(mockPage).toHaveScreenshot('mock-hrm-client.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('Dashboard with active timer', async ({
    dashboardPage,
    controlPage,
  }) => {
    // Configure timer
    await controlPage.getByTestId('work-duration-input').fill('15')
    await controlPage.getByTestId('rest-duration-input').fill('5')
    await controlPage.getByRole('button', { name: 'START' }).click()

    // Wait for timer to appear on dashboard
    await expect(dashboardPage.getByText(/WORK|REST/)).toBeVisible({
      timeout: 10000,
    })

    // Capture screenshot with running timer
    await expect(dashboardPage).toHaveScreenshot('dashboard-active-timer.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('Dashboard with mock HR data streaming', async ({
    dashboardPage,
    mockPage,
  }) => {
    // Set HR to yellow zone on mock page
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await expect(mockPage.getByLabel('Current BPM')).toHaveValue('155')

    // Wait for HR data to appear on dashboard
    await expect(dashboardPage.getByText('Mock User')).toBeVisible()

    // Capture screenshot with HR data displayed
    await expect(dashboardPage).toHaveScreenshot(
      'dashboard-with-hr-data.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    )
  })

  test('HR Tiles - all zones', async ({ dashboardPage, mockPage }) => {
    // Set HR zone and start streaming
    await mockPage.getByRole('button', { name: 'Zone 4' }).click()
    await mockPage.getByRole('button', { name: 'START' }).click()
    await expect(
      mockPage.getByRole('button', { name: 'STOP Streaming' })
    ).toBeVisible()

    // Wait for HR tiles to load on dashboard
    await expect(
      dashboardPage.locator('[data-testid="hr-tile-grid-item"]')
    ).toBeVisible({ timeout: 8000 })

    const firstTile = dashboardPage
      .locator('[data-testid="hr-tile-grid-item"]')
      .first()
    await expect(firstTile).toHaveScreenshot('hr-tiles-section.png', {
      animations: 'disabled',
      caret: 'hide',
    })
  })
})
