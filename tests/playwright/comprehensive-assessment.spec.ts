// File: tests/playwright/comprehensive-assessment.spec.ts
/**
 * Comprehensive Assessment Tests: Generate detailed screenshots and videos
 * for holistic evaluation of the HRM application functionality and UI/UX.
 */
import { expect, test } from '@playwright/test'
import {
  setupComprehensiveTest,
  waitForPageReady,
  replaceIframeWithStableWorkout,
  BASE_URL,
} from './test-helpers'

// Progress tracking helper with fixed console position
const showProgress = (current: number, total: number, description: string) => {
  const percentage = Math.round((current / total) * 100)
  const filled = Math.round(percentage / 5)
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)
  process.stdout.write(`\r[${bar}] ${percentage}% - ${description.padEnd(30)}`)
}

test.describe('Comprehensive HRM Assessment', () => {
  test.beforeEach(setupComprehensiveTest)

  test('Complete User Journey - Dashboard to Control Flow', async ({
    page,
    context,
  }) => {
    const totalSteps = 10
    process.stdout.write('\n🚀 Complete User Journey Test\n')

    // Keep all tabs open for WebSocket connections
    const dashboardTab = page
    const controlTab = await context.newPage()
    const mockTab = await context.newPage()

    // 1. Setup Dashboard (keep open)
    showProgress(1, totalSteps, 'Setting up dashboard')
    await dashboardTab.goto(BASE_URL)
    await waitForPageReady(dashboardTab)

    await dashboardTab.waitForSelector('text=Athlete Alpha', {
      timeout: 5000,
    })
    await replaceIframeWithStableWorkout(dashboardTab)
    await expect(dashboardTab).toHaveScreenshot('01-dashboard-initial.png', {
      fullPage: true,
    })
    showProgress(2, totalSteps, 'Dashboard screenshot complete')

    const stopStreaming = mockTab.getByRole('button', {
      name: /STOP Streaming/,
    })
    if (await stopStreaming.isVisible()) {
      await stopStreaming.click()
      await mockTab.waitForTimeout(500)
    }

    // 2. Setup Control Panel (keep open)
    showProgress(3, totalSteps, 'Setting up control panel')
    await controlTab.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(controlTab)
    await controlTab.waitForSelector('text=/Timer Mode/', { timeout: 5000 })
    await expect(controlTab).toHaveScreenshot('02-control-panel-initial.png', {
      fullPage: true,
    })

    // 3. Setup Mock HRM (keep open)
    showProgress(4, totalSteps, 'Setting up mock HRM')
    await mockTab.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(mockTab)
    await mockTab.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    // 4. Configure Tabata Timer
    showProgress(5, totalSteps, 'Configuring timer')
    await controlTab.fill('input[aria-label="Work duration in seconds"]', '30')
    await controlTab.fill('input[aria-label="Rest duration in seconds"]', '15')
    await expect(controlTab).toHaveScreenshot('03-timer-configured.png', {
      fullPage: true,
    })

    // 5. Start HR Streaming
    showProgress(6, totalSteps, 'Starting HR streaming')

    // Clear and fill User Name field
    const userNameField = mockTab.getByLabel('User Name')
    await userNameField.click()
    await userNameField.clear()
    await userNameField.fill('Athlete Alpha')

    // Clear and fill BPM field
    const bpmField = mockTab.getByLabel('Current BPM')
    await bpmField.click()
    await bpmField.clear()
    await bpmField.fill('145')

    // Wait for fields to update
    await mockTab.waitForTimeout(500)

    // Verify fields are filled
    await expect(userNameField).toHaveValue('Athlete Alpha')
    await expect(bpmField).toHaveValue('145')

    await mockTab.click('button:has-text("START")')
    await mockTab.waitForTimeout(2000)

    // 6. Start Timer
    showProgress(7, totalSteps, 'Starting timer')
    await controlTab.click('button:has-text("START")')
    await expect(controlTab).toHaveScreenshot('04-timer-started.png', {
      fullPage: true,
    })

    // 7. Check Dashboard with Active Timer and HR Data
    showProgress(8, totalSteps, 'Capturing active timer')
    await dashboardTab.waitForSelector('text=Athlete Alpha', { timeout: 5000 })
    await replaceIframeWithStableWorkout(dashboardTab)
    await expect(dashboardTab).toHaveScreenshot(
      '05-dashboard-active-timer.png',
      { fullPage: true }
    )

    // 8. Change HR Zone
    showProgress(9, totalSteps, 'Testing HR zone changes')
    await mockTab.getByLabel('Current BPM').fill('170')
    await mockTab.click('button:has-text("Zone 4")')

    // 9. Check Dashboard with New HR Zone
    await dashboardTab.waitForSelector('text=170 BPM', { timeout: 5000 })
    await replaceIframeWithStableWorkout(dashboardTab)
    await expect(dashboardTab).toHaveScreenshot(
      '06-dashboard-hr-zone-change.png',
      { fullPage: true }
    )

    // 10. Stop Timer
    showProgress(10, totalSteps, 'Stopping timer and cleanup')
    await controlTab.click('button:has-text("STOP")')
    await expect(controlTab).toHaveScreenshot('07-timer-stopped.png', {
      fullPage: true,
    })

    // Keep tabs open for 5 seconds to maintain connections
    const stopStreamButton = mockTab.getByRole('button', {
      name: /STOP Streaming/,
    })
    if (await stopStreamButton.isVisible()) {
      await stopStreamButton.click()
    }

    process.stdout.write('\n\n✅ Complete User Journey test finished!\n')
    process.stdout.write(
      '📊 View detailed report: npm run test:visual:report\n'
    )
  })

  test('HR Data Streaming Workflow', async ({ page, context }) => {
    const totalSteps = 15 // 5 zones * 2 screenshots + 5 setup steps
    process.stdout.write('\n💓 HR Data Streaming Test\n')

    // Keep dashboard open for WebSocket connection
    const dashboardTab = await context.newPage()
    const mockTab = page

    // 1. Setup Dashboard (keep open)
    showProgress(1, totalSteps, 'Setting up dashboard')
    await dashboardTab.goto(BASE_URL)
    await waitForPageReady(dashboardTab)
    await dashboardTab.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    // 2. Mock HRM Setup
    showProgress(2, totalSteps, 'Setting up mock HRM')
    await mockTab.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(mockTab)
    await mockTab.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })
    await expect(mockTab).toHaveScreenshot('08-mock-hrm-initial.png', {
      fullPage: true,
    })

    // 3. Configure Mock Data
    showProgress(3, totalSteps, 'Configuring mock data')

    // Clear and fill User Name field
    const userNameField = mockTab.getByLabel('User Name')
    await userNameField.click()
    await userNameField.clear()
    await userNameField.fill('Demo Athlete')

    // Clear and fill BPM field
    const mockBpmInput = mockTab.getByLabel('Current BPM')
    await mockBpmInput.click()
    await mockBpmInput.clear()
    await mockBpmInput.fill('145')

    // Verify fields are filled
    await expect(userNameField).toHaveValue('Demo Athlete')
    await expect(mockBpmInput).toHaveValue('145')

    await expect(mockTab).toHaveScreenshot('09-mock-hrm-configured.png', {
      fullPage: true,
    })

    // 4. Start Streaming
    showProgress(4, totalSteps, 'Starting HR stream')
    await mockTab.click('button:has-text("START")')
    await expect(mockTab).toHaveScreenshot('10-mock-hrm-streaming.png', {
      fullPage: true,
    })

    // 5. Test Different HR Zones
    showProgress(5, totalSteps, 'Testing HR zones')
    const zones = [
      { zone: 'Zone 1', bpm: '120', color: 'blue' },
      { zone: 'Zone 2', bpm: '140', color: 'green' },
      { zone: 'Zone 3', bpm: '160', color: 'yellow' },
      { zone: 'Zone 4', bpm: '180', color: 'orange' },
      { zone: 'Zone 5', bpm: '200', color: 'red' },
    ]

    for (const [index, zone] of zones.entries()) {
      const stepNum = 6 + index * 2
      showProgress(
        stepNum,
        totalSteps,
        `Testing ${zone.zone} (${zone.bpm} BPM)`
      )

      // Clear and fill BPM field for each zone
      await mockBpmInput.click()
      await mockBpmInput.clear()
      await mockBpmInput.fill(zone.bpm)

      // Verify BPM field is updated
      await expect(mockBpmInput).toHaveValue(zone.bpm)

      await mockTab.getByRole('button', { name: zone.zone }).click()

      // Check dashboard reflects the change
      showProgress(stepNum + 1, totalSteps, `Dashboard ${zone.zone} screenshot`)
      await dashboardTab.waitForSelector(`text=${zone.bpm} BPM`, {
        timeout: 3000,
      })
      await replaceIframeWithStableWorkout(dashboardTab)
      await expect(dashboardTab).toHaveScreenshot(
        `12-dashboard-zone-${index + 1}.png`,
        { fullPage: true }
      )
    }
  })

  test('Multi-Device Coordination', async ({ page, context }) => {
    const controlTab = page
    const dashboardTab = await context.newPage()
    const mockTab = await context.newPage()

    // Setup all tabs
    await controlTab.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(controlTab)
    await controlTab.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    await dashboardTab.goto(BASE_URL)
    await waitForPageReady(dashboardTab)
    await dashboardTab.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    await mockTab.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(mockTab)
    await mockTab.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    // Start HR streaming
    await mockTab.getByLabel('User Name').fill('Team Device')
    const multiDeviceBpmInput = mockTab.getByLabel('Current BPM')
    await multiDeviceBpmInput.fill('145')
    await mockTab.click('button:has-text("START")')
    await mockTab.waitForTimeout(2000)

    // Configure and start timer
    await controlTab.fill('input[aria-label="Work duration in seconds"]', '45')
    await controlTab.fill('input[aria-label="Rest duration in seconds"]', '15')
    await controlTab.click('button:has-text("START")')
    await controlTab.waitForTimeout(2000)

    // Take coordinated screenshots
    await expect(controlTab).toHaveScreenshot('multi-device-control.png', {
      fullPage: true,
    })
    await replaceIframeWithStableWorkout(dashboardTab)
    await expect(dashboardTab).toHaveScreenshot('multi-device-dashboard.png', {
      fullPage: true,
    })
    await expect(mockTab).toHaveScreenshot('multi-device-hr-monitor.png', {
      fullPage: true,
    })

    // Keep connections alive
    const stopMultiStream = mockTab.getByRole('button', {
      name: /STOP Streaming/,
    })
    if (await stopMultiStream.isVisible()) {
      await stopMultiStream.click()
      await mockTab.waitForTimeout(500)
    }

    await dashboardTab.waitForTimeout(5000)
  })

  test('Bluetooth HRM Connection Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/connect`)
    await page.waitForSelector('text=/Bluetooth HRM/', { timeout: 5000 })
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('12-bluetooth-connect-initial.png', {
      fullPage: true,
    })

    await page.fill('input[placeholder="Your name"]', 'Test User')
    await page.fill('input[type="number"][placeholder="25"]', '28')
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('13-bluetooth-user-info.png', {
      fullPage: true,
    })

    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('14-bluetooth-ready-to-connect.png', {
      fullPage: true,
    })

    await page.waitForTimeout(2000)
  })

  test('Responsive Design Assessment', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })
    await page.waitForTimeout(2000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('15-desktop-1920x1080.png', {
      fullPage: true,
    })

    await page.setViewportSize({ width: 1366, height: 768 })
    await page.waitForTimeout(2000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('16-laptop-1366x768.png', {
      fullPage: true,
    })

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(2000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('17-tablet-768x1024.png', {
      fullPage: true,
    })

    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('18-control-tablet-768x1024.png', {
      fullPage: true,
    })

    await page.waitForTimeout(2000)
  })

  test('Error States and Edge Cases', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })
    await page.waitForTimeout(3000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('19-dashboard-no-data.png', {
      fullPage: true,
    })

    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })
    await page.waitForTimeout(1000)

    await page.click('text=Stopwatch')
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('20-stopwatch-mode.png', {
      fullPage: true,
    })

    await page.click('text=Tabata')
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('21-tabata-mode.png', {
      fullPage: true,
    })

    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('22-mock-disconnected.png', {
      fullPage: true,
    })

    await page.waitForTimeout(2000)
  })

  test('Navigation and UI Components', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })
    await page.waitForTimeout(2000)

    await page.hover('text=Phone Controls')
    await page.waitForTimeout(1000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('23-nav-hover-phone.png', {
      fullPage: true,
    })

    await page.hover('text=Stream HR')
    await page.waitForTimeout(1000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('24-nav-hover-stream.png', {
      fullPage: true,
    })

    await page.waitForSelector('iframe', { timeout: 5000 })
    await page.waitForTimeout(2000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('25-google-doc-integration.png', {
      fullPage: true,
    })

    const spotifyButton = page.locator('text=Login with Spotify')
    if (await spotifyButton.isVisible()) {
      await replaceIframeWithStableWorkout(page)
      await expect(page).toHaveScreenshot('26-spotify-logged-out.png', {
        fullPage: true,
      })
    }

    await page.waitForTimeout(3000)
  })

  test('Performance and Loading States', async ({ page }) => {
    const startTime = Date.now()
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })
    const loadTime = Date.now() - startTime

    console.log(`Dashboard load time: ${loadTime}ms`)
    await page.waitForTimeout(2000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('27-dashboard-loaded.png', {
      fullPage: true,
    })

    await page.evaluate(() => {
      const indicator = document.createElement('div')
      indicator.id = 'ws-status'
      indicator.style.cssText =
        'position:fixed;top:10px;right:10px;padding:8px;background:green;color:white;border-radius:4px;z-index:9999;'
      indicator.textContent = 'WebSocket: Connected'
      document.body.appendChild(indicator)
    })
    await page.waitForTimeout(2000)
    await replaceIframeWithStableWorkout(page)
    await expect(page).toHaveScreenshot('28-websocket-status.png', {
      fullPage: true,
    })

    await page.waitForTimeout(3000)
  })
})
