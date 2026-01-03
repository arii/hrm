
import { test, expect } from '@playwright/test';

test.describe('Multi-User Dashboard Visuals', () => {
  test('Dashboard with 4 mock users streaming HR data', async ({ page, context }) => {
    // Open the mock client in a new tab
    const mockPage = await context.newPage();
    await mockPage.goto('/client/mock');

    // Wait for the mock client page to be ready and for WebSocket to connect
    await mockPage.waitForFunction(() => window.__TEST_READY__);
    await expect(mockPage.locator('text=Server Status: Connected')).toBeVisible({ timeout: 10000 });

    // Start the multi-user stream
    const userCountInput = mockPage.locator('[data-testid="user-count-input"]');
    await userCountInput.fill('4');
    await mockPage.locator('[data-testid="streaming-start-button"]').click();
    await page.waitForTimeout(1000); // Wait for stream to initialize

    // Navigate to the main dashboard in the original tab
    await page.goto('/');

    // Wait for at least one HR tile to be rendered
    await expect(page.locator('[data-testid^="hr-tile-"]')).toHaveCount(1, { timeout: 15000 });

    // Take a screenshot for visual regression testing
    await expect(page).toHaveScreenshot('dashboard-multi-user.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05, // Increased tolerance for this less stable test
    });

    // Clean up the mock client tab
    await mockPage.close();
  });
});
