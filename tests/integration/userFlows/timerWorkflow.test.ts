import { test, expect, Page } from '@playwright/test'

test.describe('Timer Workflow Integration', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/')
  })

  test('complete timer start/stop workflow', async () => {
    // Navigate to control page
    await page.goto('/client/control')
    
    // Wait for page to load
    await expect(page.locator('text=Timer Mode')).toBeVisible()
    
    // Start timer
    await page.click('[data-testid="start-timer-button"]')
    
    // Verify timer is running
    await expect(page.locator('text=WORK')).toBeVisible()
    
    // Check that time is counting down
    const initialTime = await page.textContent('[data-testid="timer-display"]')
    await page.waitForTimeout(2000)
    const updatedTime = await page.textContent('[data-testid="timer-display"]')
    
    expect(initialTime).not.toBe(updatedTime)
    
    // Stop timer
    await page.click('[data-testid="stop-timer-button"]')
    
    // Verify timer is stopped
    await expect(page.locator('text=STOPPED')).toBeVisible()
  })

  test('timer state synchronization across pages', async () => {
    // Open control page
    await page.goto('/client/control')
    
    // Open dashboard in new tab
    const dashboardPage = await page.context().newPage()
    await dashboardPage.goto('/')
    
    // Start timer from control page
    await page.click('[data-testid="start-timer-button"]')
    
    // Verify state is synchronized on dashboard
    await expect(dashboardPage.locator('text=WORK')).toBeVisible()
    
    // Stop timer from dashboard (if controls available)
    // Or verify timer state is consistent
    const controlTimerState = await page.textContent('[data-testid="timer-phase"]')
    const dashboardTimerState = await dashboardPage.textContent('[data-testid="timer-phase"]')
    
    expect(controlTimerState).toBe(dashboardTimerState)
  })

  test('timer mode switching', async () => {
    await page.goto('/client/control')
    
    // Switch to different timer mode
    await page.click('[data-testid="timer-mode-selector"]')
    await page.click('text=HIIT')
    
    // Verify mode changed
    await expect(page.locator('text=HIIT')).toBeVisible()
    
    // Start timer in new mode
    await page.click('[data-testid="start-timer-button"]')
    
    // Verify timer works in new mode
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible()
  })

  test('timer persistence across page refresh', async () => {
    await page.goto('/client/control')
    
    // Start timer
    await page.click('[data-testid="start-timer-button"]')
    
    // Wait for timer to start
    await expect(page.locator('text=WORK')).toBeVisible()
    
    // Refresh page
    await page.reload()
    
    // Verify timer state is restored
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible()
  })
})
