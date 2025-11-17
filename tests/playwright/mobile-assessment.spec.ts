// File: tests/playwright/mobile-assessment.spec.ts
/**
 * Mobile Assessment Tests: Focus on mobile-specific UI/UX and touch interactions
 */
import { test, expect, type Page } from '@playwright/test'

const BASE_URL =
  process.env.BASE_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'

test.describe('Mobile HRM Assessment', () => {
  test.beforeEach(async ({ page }) => {
    // iPhone 12 Pro dimensions
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('Mobile Dashboard Experience', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-01-dashboard-portrait.png', {
      fullPage: true,
    })

    // Landscape orientation
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-02-dashboard-landscape.png', {
      fullPage: true,
    })
  })

  test('Mobile Control Panel - Primary Use Case', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await expect(page.locator('text=/Timer Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-03-control-initial.png', {
      fullPage: true,
    })

    // Timer Configuration
    await page.fill('input[aria-label="Work duration in seconds"]', '45')
    await page.fill('input[aria-label="Rest duration in seconds"]', '15')
    await expect(
      page.locator('input[aria-label="Work duration in seconds"]')
    ).toHaveValue('45')
    await expect(page).toHaveScreenshot('mobile-04-timer-config.png', {
      fullPage: true,
    })

    // Start Timer
    await page.click('button:has-text("START")')
    await expect(page.locator('button:has-text("PAUSE")')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-05-timer-running.png', {
      fullPage: true,
    })

    // Pause Timer
    await page.click('button:has-text("PAUSE")')
    await expect(page.locator('button:has-text("RESUME")')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-06-timer-paused.png', {
      fullPage: true,
    })

    // Resume Timer
    await page.click('button:has-text("RESUME")')
    await expect(page.locator('button:has-text("PAUSE")')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-07-timer-resumed.png', {
      fullPage: true,
    })

    // Stop Timer
    await page.click('button:has-text("STOP")')
    await expect(page.locator('button:has-text("START")')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-08-timer-stopped.png', {
      fullPage: true,
    })
  })

  test('Mobile Spotify Controls', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Scroll to Spotify section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.locator('text=Spotify Controls')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-09-spotify-controls.png', {
      fullPage: true,
    })

    // Test volume control interaction
    const volumeSlider = page.locator('input[type="range"]')
    if (await volumeSlider.isVisible()) {
      await volumeSlider.click()
      await expect(page).toHaveScreenshot('mobile-10-volume-interaction.png', {
        fullPage: true,
      })
    }
  })

  test('Mobile Mock HRM Interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })
    await expect(page).toHaveScreenshot('mobile-11-mock-initial.png', {
      fullPage: true,
    })

    // Fill device info
    await page.fill('input[placeholder="Device ID"]', 'MOBILE-TEST')
    await page.fill('input[type="number"]', '155')
    await expect(page.locator('input[value="MOBILE-TEST"]')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-12-mock-configured.png', {
      fullPage: true,
    })

    // Test zone buttons
    await page.click('button:has-text("Zone 3")')
    await expect(page.locator('input[type="number"]')).toHaveValue('165')
    await expect(page).toHaveScreenshot('mobile-13-zone-selected.png', {
      fullPage: true,
    })

    // Start streaming
    await page.click('button:has-text("START")')
    await expect(page.locator('button:has-text("STOP Streaming")')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-14-streaming-active.png', {
      fullPage: true,
    })
  })

  test('Mobile Bluetooth Connection', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/connect`)
    await page.waitForSelector('text=/Bluetooth HRM/', { timeout: 5000 })
    await expect(page).toHaveScreenshot('mobile-15-bluetooth-initial.png', {
      fullPage: true,
    })

    // Fill user information
    await page.fill('input[placeholder="Your name"]', 'Mobile User')
    await page.fill('input[type="number"][placeholder="25"]', '32')
    await expect(page.locator('input[value="Mobile User"]')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-16-user-info-filled.png', {
      fullPage: true,
    })

    // Scroll to see connect button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.locator('text=Connect to HRM')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-17-ready-to-connect.png', {
      fullPage: true,
    })
  })

  test('Mobile Navigation Flow', async ({ page }) => {
    // Start at dashboard
    await page.goto(BASE_URL)
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-18-nav-dashboard.png', {
      fullPage: true,
    })

    // Navigate to Phone Controls
    await page.click('text=Phone Controls')
    await expect(page.locator('text=/Timer Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-19-nav-controls.png', {
      fullPage: true,
    })

    // Navigate to Stream HR
    await page.click('text=Stream HR')
    await expect(page.locator('text=/Bluetooth HRM/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-20-nav-stream.png', {
      fullPage: true,
    })

    // Back to Dashboard
    await page.click('text=Dashboard')
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-21-nav-back-dashboard.png', {
      fullPage: true,
    })
  })

  test('Mobile Touch Interactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Test stepper interactions
    const workPlusButton = page.locator(
      'button[aria-label="Increase work duration"]'
    )
    if (await workPlusButton.isVisible()) {
      await workPlusButton.click()
      await workPlusButton.click()
      await workPlusButton.click()
      await expect(
        page.locator('input[aria-label="Work duration in seconds"]')
      ).toHaveValue('3')
      await expect(page).toHaveScreenshot('mobile-22-stepper-interaction.png', {
        fullPage: true,
      })
    }

    // Test mode switching
    await page.click('text=Stopwatch')
    await expect(page.locator('text=/Stopwatch Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-23-mode-switch.png', {
      fullPage: true,
    })

    await page.click('text=Tabata')
    await expect(page.locator('text=/Tabata Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-24-mode-back.png', {
      fullPage: true,
    })
  })

  test('Mobile Error States', async ({ page }) => {
    // Test with very small screen (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`${BASE_URL}/client/control`)
    await expect(page.locator('text=/Timer Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-25-small-screen.png', {
      fullPage: true,
    })

    // Test landscape on small screen
    await page.setViewportSize({ width: 667, height: 375 })
    await expect(page.locator('text=/Timer Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-26-small-landscape.png', {
      fullPage: true,
    })
  })

  test('Mobile Performance Indicators', async ({ page }) => {
    // Add performance overlay
    await page.goto(`${BASE_URL}/client/control`)

    await page.evaluate(() => {
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        font-size: 12px;
        z-index: 10000;
      `
      overlay.innerHTML = `
        <div>Screen: ${window.innerWidth}x${window.innerHeight}</div>
        <div>User Agent: ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</div>
        <div>Touch Support: ${'ontouchstart' in window ? 'Yes' : 'No'}</div>
      `
      document.body.appendChild(overlay)
    })

    await expect(page.locator('text=/Timer Mode/')).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-27-performance-info.png', {
      fullPage: true,
    })
  })
})
