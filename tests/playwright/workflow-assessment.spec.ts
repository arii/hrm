// File: tests/playwright/workflow-assessment.spec.ts
/**
 * Workflow Assessment Tests: End-to-end user scenarios with video recording
 */
import { test, expect } from '@playwright/test'
import { getBaseURL } from '@/utils/urls'

const BASE_URL = getBaseURL()

test.describe('HRM Workflow Assessment', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('Complete Workout Session - Tabata with HR Monitoring', async ({
    page,
  }) => {
    // Step 1: Setup Mock HR Device
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    await page.fill('input[placeholder="Device ID"]', 'WORKOUT-SESSION-001')
    await page.fill('input[type="number"]', '120')
    await page.click('button:has-text("START")')
    await expect(
      page.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Step 2: Configure Workout on Control Panel
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Set 30s work, 15s rest for demo
    await page.fill('input[aria-label="Work duration in seconds"]', '30')
    await page.fill('input[aria-label="Rest duration in seconds"]', '15')
    await expect(
      page.locator('input[aria-label="Work duration in seconds"]')
    ).toHaveValue('30')

    // Step 3: Start Workout
    await page.click('button:has-text("START")')
    await expect(page.locator('button:has-text("STOP")')).toBeVisible()

    // Step 4: Monitor on Dashboard
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK|REST/')).toBeVisible()

    // Step 5: Simulate HR Zone Changes During Workout
    await page.goto(`${BASE_URL}/client/mock`)

    // Warm-up zone
    await page.fill('input[type="number"]', '140')
    await page.click('button:has-text("Zone 2")')
    await expect(page.locator('input[type="number"]')).toHaveValue('140')

    // Work zone
    await page.fill('input[type="number"]', '170')
    await page.click('button:has-text("Zone 4")')
    await expect(page.locator('input[type="number"]')).toHaveValue('170')

    // Recovery zone
    await page.fill('input[type="number"]', '130')
    await page.click('button:has-text("Zone 1")')
    await expect(page.locator('input[type="number"]')).toHaveValue('130')

    // Step 6: Return to Dashboard for Final View
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()

    // Step 7: Stop Workout
    await page.goto(`${BASE_URL}/client/control`)
    await page.click('button:has-text("STOP")')
    await expect(page.locator('button:has-text("START")')).toBeVisible()

    await expect(page).toHaveScreenshot('workflow-complete-session.png', {
      fullPage: true,
    })
  })

  test('Multi-Device Coordination Simulation', async ({ page, context }) => {
    // Simulate trainer using control panel while participant views dashboard

    // Page 1: Trainer Control Panel
    const controlPage = page
    await controlPage.goto(`${BASE_URL}/client/control`)
    await controlPage.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Page 2: Participant Dashboard (new tab)
    const dashboardPage = await context.newPage()
    await dashboardPage.goto(BASE_URL)
    await dashboardPage.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    // Page 3: HR Monitor (new tab)
    const mockPage = await context.newPage()
    await mockPage.goto(`${BASE_URL}/client/mock`)
    await mockPage.waitForSelector('text=/HRM Mock Streamer/', {
      timeout: 5000,
    })

    // Setup HR monitoring
    await mockPage.fill('input[placeholder="Device ID"]', 'PARTICIPANT-001')
    await mockPage.fill('input[type="number"]', '145')
    await mockPage.click('button:has-text("START")')
    await expect(
      mockPage.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Trainer configures workout
    await controlPage.fill('input[aria-label="Work duration in seconds"]', '45')
    await controlPage.fill('input[aria-label="Rest duration in seconds"]', '15')

    // Start workout from control panel
    await controlPage.click('button:has-text("START")')
    await expect(controlPage.locator('button:has-text("STOP")')).toBeVisible()

    // Verify dashboard shows active timer
    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible()

    // Simulate HR changes during workout
    await mockPage.fill('input[type="number"]', '165')
    await mockPage.click('button:has-text("Zone 3")')
    await expect(mockPage.locator('input[type="number"]')).toHaveValue('165')

    // Take coordinated screenshots
    await expect(controlPage).toHaveScreenshot('multi-device-control.png', {
      fullPage: true,
    })
    await expect(dashboardPage).toHaveScreenshot('multi-device-dashboard.png', {
      fullPage: true,
    })
    await expect(mockPage).toHaveScreenshot('multi-device-hr-monitor.png', {
      fullPage: true,
    })

    // Stop workout
    await controlPage.click('button:has-text("STOP")')
    await expect(controlPage.locator('button:has-text("START")')).toBeVisible()

    await dashboardPage.close()
    await mockPage.close()
  })

  test('Error Recovery and Edge Cases', async ({ page }) => {
    // Test 1: Network Disconnection Simulation
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    await page.fill('input[type="number"]', '150')
    await page.click('button:has-text("START")')
    await expect(
      page.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Simulate network issues by going offline
    await page.context().setOffline(true)
    await expect(page.locator('text=Server Status: Disconnected')).toBeVisible()
    await expect(page).toHaveScreenshot('error-offline-state.png', {
      fullPage: true,
    })

    // Restore connection
    await page.context().setOffline(false)
    await expect(page.locator('text=Server Status: Connected')).toBeVisible()
    await expect(page).toHaveScreenshot('error-reconnected-state.png', {
      fullPage: true,
    })

    // Test 2: Invalid Timer Configuration
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Try to set invalid values
    await page.fill('input[aria-label="Work duration in seconds"]', '0')
    await page.fill('input[aria-label="Rest duration in seconds"]', '0')
    await expect(
      page.locator('input[aria-label="Work duration in seconds"]')
    ).toHaveValue('0')
    await expect(page).toHaveScreenshot('error-invalid-timer-config.png', {
      fullPage: true,
    })

    // Test 3: Rapid Mode Switching
    await page.click('text=Stopwatch')
    await expect(page.locator('text=/Stopwatch Mode/')).toBeVisible()
    await page.click('text=Tabata')
    await expect(page.locator('text=/Tabata Mode/')).toBeVisible()
    await page.click('text=Stopwatch')
    await expect(page.locator('text=/Stopwatch Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('error-rapid-mode-switching.png', {
      fullPage: true,
    })
  })

  test('Performance Under Load Simulation', async ({ page }) => {
    // Simulate high-frequency HR data updates
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    await page.fill('input[placeholder="Device ID"]', 'LOAD-TEST-DEVICE')
    await page.click('button:has-text("START")')
    await expect(
      page.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Rapid HR updates
    const hrValues = [120, 135, 150, 165, 180, 175, 160, 145, 130, 125]
    for (const hr of hrValues) {
      await page.fill('input[type="number"]', hr.toString())
      await page.click('button:has-text("Zone 3")')
      await expect(page.locator('input[type="number"]')).toHaveValue(
        hr.toString()
      )
    }

    // Check dashboard responsiveness
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await expect(page).toHaveScreenshot(
      'performance-high-frequency-updates.png',
      { fullPage: true }
    )

    // Test timer precision under load
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    await page.fill('input[aria-label="Work duration in seconds"]', '10')
    await page.fill('input[aria-label="Rest duration in seconds"]', '5')
    await page.click('button:has-text("START")')

    // Continue HR updates during timer
    const mockTab = await page.context().newPage()
    await mockTab.goto(`${BASE_URL}/client/mock`)
    await mockTab.waitForSelector('text=/Server Status/', { timeout: 5000 })

    for (let i = 0; i < 10; i++) {
      await mockTab.fill('input[type="number"]', (140 + i * 5).toString())
      await mockTab.click('button:has-text("Zone 2")')
      await expect(mockTab.locator('input[type="number"]')).toHaveValue(
        (140 + i * 5).toString()
      )
    }

    await expect(page.locator('button:has-text("STOP")')).toBeVisible()
    await expect(page).toHaveScreenshot('performance-timer-under-load.png', {
      fullPage: true,
    })

    await mockTab.close()
  })

  test('Accessibility and Keyboard Navigation', async ({ page }) => {
    // Test keyboard navigation on control panel
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Tab through controls
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator('button:has-text("START")')).toBeFocused({
      timeout: 1000,
    })
    await expect(page).toHaveScreenshot('accessibility-keyboard-focus.png', {
      fullPage: true,
    })

    // Test keyboard shortcuts
    await page.keyboard.press('Space') // Should activate focused element
    await expect(page.locator('button:has-text("STOP")')).toBeVisible()
    await expect(page).toHaveScreenshot(
      'accessibility-keyboard-activation.png',
      { fullPage: true }
    )

    // Test high contrast mode simulation
    await page.addStyleTag({
      content: `
        * {
          filter: contrast(200%) !important;
        }
        body {
          background: black !important;
          color: white !important;
        }
      `,
    })
    // Flexible check: background color is "dark enough" (all RGB channels <= 10)
    const bgColor = await page.evaluate(() => {
      const c = getComputedStyle(document.body).backgroundColor
      // c is usually 'rgb(r, g, b)' or 'rgba(r, g, b, a)'
      const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (!match) return c
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        raw: c,
      }
    })
    if (typeof bgColor === 'string') {
      // fallback: allow any variant of rgb(0,0,0) with optional spaces
      expect(bgColor.replace(/\s+/g, '')).toMatch(/^rgb\(0,0,0\)$/)
    } else {
      expect(bgColor.r).toBeLessThanOrEqual(10)
      expect(bgColor.g).toBeLessThanOrEqual(10)
      expect(bgColor.b).toBeLessThanOrEqual(10)
    }
    await expect(page).toHaveScreenshot('accessibility-high-contrast.png', {
      fullPage: true,
    })
  })

  test('Data Persistence and State Recovery', async ({ page }) => {
    // Test 1: Timer state persistence across navigation
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Configure and start timer
    await page.fill('input[aria-label="Work duration in seconds"]', '60')
    await page.fill('input[aria-label="Rest duration in seconds"]', '30')
    await page.click('button:has-text("START")')
    await expect(page.locator('button:has-text("STOP")')).toBeVisible()

    // Navigate away and back
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await page.goto(`${BASE_URL}/client/control`)
    await expect(page.locator('button:has-text("STOP")')).toBeVisible()

    // Verify timer is still running
    await expect(page).toHaveScreenshot('persistence-timer-state.png', {
      fullPage: true,
    })

    // Test 2: HR data persistence
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    await page.fill('input[placeholder="Device ID"]', 'PERSISTENCE-TEST')
    await page.fill('input[type="number"]', '155')
    await page.click('button:has-text("START")')
    await expect(
      page.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Navigate to dashboard and back
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await page.goto(`${BASE_URL}/client/mock`)
    await expect(
      page.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()

    // Verify connection state persisted
    await expect(page).toHaveScreenshot('persistence-hr-connection.png', {
      fullPage: true,
    })

    // Clean up - stop timer
    await page.goto(`${BASE_URL}/client/control`)
    await page.click('button:has-text("STOP")')
    // Wait for START button to confirm timer stopped instead of arbitrary timeout
    await expect(page.locator('button:has-text("START")')).toBeVisible()
  })
})
