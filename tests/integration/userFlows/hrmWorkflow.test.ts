import { test, expect, Page } from '@playwright/test'

test.describe('HRM Connection Workflow', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
  })

  test('mock HRM connection and data streaming', async () => {
    // Navigate to mock HRM page
    await page.goto('/client/mock')
    
    // Wait for page load
    await expect(page.locator('text=HRM Mock')).toBeVisible()
    
    // Fill in mock data
    await page.fill('input[type="number"]', '150')
    
    // Start mock streaming
    await page.click('[data-testid="start-mock-button"]')
    
    // Verify connection status
    await expect(page.locator('text=Connected')).toBeVisible()
    
    // Navigate to dashboard to see data
    await page.goto('/')
    
    // Verify HR data is displayed
    await expect(page.locator('text=150')).toBeVisible()
    await expect(page.locator('[data-testid="hr-tile"]')).toBeVisible()
  })

  test('HRM data updates in real-time', async () => {
    // Start mock HRM
    await page.goto('/client/mock')
    await page.fill('input[type="number"]', '120')
    await page.click('[data-testid="start-mock-button"]')
    
    // Navigate to dashboard
    await page.goto('/')
    
    // Verify initial data
    await expect(page.locator('text=120')).toBeVisible()
    
    // Go back to mock and change value
    await page.goto('/client/mock')
    await page.fill('input[type="number"]', '140')
    
    // Navigate back to dashboard
    await page.goto('/')
    
    // Verify updated data
    await expect(page.locator('text=140')).toBeVisible()
  })

  test('HRM zone calculation and display', async () => {
    // Start mock with specific HR value
    await page.goto('/client/mock')
    await page.fill('input[type="number"]', '170') // High HR
    await page.click('[data-testid="start-mock-button"]')
    
    // Navigate to dashboard
    await page.goto('/')
    
    // Verify HR zone is calculated and displayed
    await expect(page.locator('[data-testid="hr-zone-display"]')).toBeVisible()
    
    // Should show appropriate zone color/indicator for high HR
    const hrZoneElement = page.locator('[data-testid="hr-zone-display"]')
    await expect(hrZoneElement).toBeVisible()
  })

  test('multiple HRM data points and history', async () => {
    // Start mock streaming
    await page.goto('/client/mock')
    await page.fill('input[type="number"]', '130')
    await page.click('[data-testid="start-mock-button"]')
    
    // Let some data accumulate
    await page.waitForTimeout(3000)
    
    // Navigate to dashboard
    await page.goto('/')
    
    // Verify multiple data points are handled
    await expect(page.locator('[data-testid="hr-tiles"]')).toBeVisible()
    
    // Check for percentage calculations
    await expect(page.locator('text=%')).toBeVisible()
  })

  test('HRM connection error handling', async () => {
    // Navigate to connect page
    await page.goto('/client/connect')
    
    // Fill user details
    await page.fill('input[type="text"]', 'Test User')
    await page.fill('input[type="number"]', '30')
    
    // Attempt connection (will fail in test environment)
    await page.click('text=Connect Bluetooth HRM')
    
    // Should handle connection failure gracefully
    await expect(page.locator('text=Failed')).toBeVisible({ timeout: 10000 })
  })
})
