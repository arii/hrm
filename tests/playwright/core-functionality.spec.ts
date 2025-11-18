// File: tests/playwright/core-functionality.spec.ts
/**
 * Core Functionality Tests: Essential HRM application tests
 * Consolidated from multiple test files to reduce redundancy and improve maintainability
 */
import { test, expect } from './fixtures'
import { setupVisualRegressionTest, BASE_URL } from './test-helpers'

test.describe('HRM Core Functionality', () => {
  test.beforeEach(setupVisualRegressionTest)

  test('Dashboard - main interface', async ({ dashboardPage }) => {
    await expect(dashboardPage).toHaveScreenshot('dashboard-main.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.2,
    })
  })

  test('Dashboard - with HR data streaming', async ({
    mockPage,
    dashboardPage,
  }) => {
    // Configure and start HR streaming
    await mockPage.getByLabel('User Name').fill('Test Athlete')
    await mockPage.getByLabel('Current BPM').fill('155')
    await mockPage.getByRole('button', { name: 'Zone 3' }).click()
    await mockPage.click('button:has-text("START")')

    // Wait for data to appear on dashboard
    await dashboardPage.waitForSelector('text=Test Athlete', { timeout: 8000 })
    await dashboardPage.waitForSelector('text=155 BPM', { timeout: 5000 })

    await expect(dashboardPage).toHaveScreenshot('dashboard-with-data.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Control Panel - timer configuration', async ({ controlPage }) => {
    // Configure timer settings
    await controlPage.fill('input[aria-label="Work duration in seconds"]', '45')
    await controlPage.fill('input[aria-label="Rest duration in seconds"]', '15')
    await expect(
      controlPage.locator('input[aria-label="Work duration in seconds"]')
    ).toHaveValue('45')

    await expect(controlPage).toHaveScreenshot('control-panel.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Control Panel - active workout', async ({ controlPage }) => {
    // Start timer
    await controlPage.fill('input[aria-label="Work duration in seconds"]', '30')
    await controlPage.fill('input[aria-label="Rest duration in seconds"]', '10')
    await controlPage.click('button:has-text("START")')

    // Wait for timer to be active
    await expect(controlPage.locator('button:has-text("PAUSE")')).toBeVisible()

    await expect(controlPage).toHaveScreenshot('control-panel-running.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mock HRM - data streaming', async ({ mockPage }) => {
    // Configure mock device
    await mockPage.getByLabel('User Name').fill('Mock User')
    await mockPage.getByLabel('Current BPM').fill('145')
    await mockPage.getByRole('button', { name: 'Zone 2' }).click()
    await expect(mockPage.locator('input[type="number"]')).toHaveValue('140')

    await expect(mockPage).toHaveScreenshot('mock-hrm.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Bluetooth connection interface', async ({ connectPage }) => {
    await connectPage.fill('input[placeholder="Your name"]', 'Test User')
    await connectPage.fill('input[type="number"][placeholder="25"]', '28')
    await expect(connectPage.locator('input[value="Test User"]')).toBeVisible()

    await expect(connectPage).toHaveScreenshot('bluetooth-connect.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Complete workout workflow', async ({ page, context }) => {
    // Multi-tab workflow test
    const dashboardTab = page
    const controlTab = await context.newPage()
    const mockTab = await context.newPage()

    // Setup dashboard
    await dashboardTab.goto(BASE_URL)
    await dashboardTab.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    // Setup control panel
    await controlTab.goto(`${BASE_URL}/client/control`)
    await controlTab.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Setup mock HRM
    await mockTab.goto(`${BASE_URL}/client/mock`)
    await mockTab.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    // Start HR streaming
    await mockTab.getByLabel('User Name').fill('Workout User')
    await mockTab.getByLabel('Current BPM').fill('140')
    await mockTab.click('button:has-text("START")')
    await expect(mockTab.locator('button:has-text("STOP Streaming")')).toBeVisible()

    // Configure and start timer
    await controlTab.fill('input[aria-label="Work duration in seconds"]', '20')
    await controlTab.fill('input[aria-label="Rest duration in seconds"]', '10')
    await controlTab.click('button:has-text("START")')

    // Verify dashboard shows active workout
    await dashboardTab.waitForSelector('text=Workout User', { timeout: 5000 })
    await dashboardTab.waitForSelector('text=/WORK|REST/', { timeout: 5000 })

    await expect(dashboardTab).toHaveScreenshot('workflow-complete.png', {
      fullPage: true,
      animations: 'disabled',
    })

    // Stop workout
    await controlTab.click('button:has-text("STOP")')
    await mockTab.getByRole('button', { name: /STOP/ }).click()

    // Cleanup
    await controlTab.close()
    await mockTab.close()
  })
})
