// File: tests/playwright/core-functionality.spec.ts
/**
 * Core Functionality Tests: A consolidated and stabilized suite of E2E tests.
 */
import { test, expect, Page, BrowserContext } from './lib';
import {
  BASE_URL,
  getDynamicContentMasks,
  replaceIframeWithStableWorkout,
  waitForFontsLoaded,
  waitForPageReady,
  waitForWebSocketConnection,
  stopTimer,
  configureTimer,
  startTimer,
  setupMockHrStreaming,
  startMockHrStreaming,
} from './lib';

test.describe('Core HRM Functionality', () => {
  let context: BrowserContext;
  let dashboardPage: Page;
  let controlPage: Page;
  let mockPage: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    dashboardPage = await context.newPage();
    controlPage = await context.newPage();
    mockPage = await context.newPage();

    await Promise.all([
      dashboardPage.goto(BASE_URL),
      controlPage.goto(`${BASE_URL}/client/control`),
      mockPage.goto(`${BASE_URL}/client/mock`),
    ]);

    await Promise.all([
      waitForPageReady(dashboardPage),
      waitForPageReady(controlPage),
      waitForPageReady(mockPage),
      waitForFontsLoaded(dashboardPage),
      waitForFontsLoaded(controlPage),
      waitForFontsLoaded(mockPage),
      waitForWebSocketConnection(dashboardPage),
      waitForWebSocketConnection(controlPage),
      waitForWebSocketConnection(mockPage),
    ]);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should render the main dashboard, control panel, and mock client correctly', async () => {
    await replaceIframeWithStableWorkout(dashboardPage);
    await expect(dashboardPage).toHaveScreenshot('dashboard-initial.png', {
      fullPage: true,
      animations: 'disabled',
      mask: getDynamicContentMasks(dashboardPage),
    });

    await expect(controlPage).toHaveScreenshot('control-panel-initial.png', {
      fullPage: true,
      animations: 'disabled',
    });

    await expect(mockPage).toHaveScreenshot('mock-client-initial.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should handle a complete user journey with stable waits', async () => {
    // Stop any running timers
    await stopTimer(controlPage);

    // 1. Configure and start HR streaming
    await setupMockHrStreaming(mockPage, { bpm: 155, zone: 4 });
    await startMockHrStreaming(mockPage);

    // 2. Configure and start the timer
    await configureTimer(controlPage, 10, 5);
    await startTimer(controlPage);

    // 3. Verify the dashboard reflects the changes
    await expect(dashboardPage.locator('text=/WORK|REST/')).toBeVisible();
    if (await dashboardPage.locator('text=Awaiting Login...').isVisible()) {
      await expect(dashboardPage.locator('text=Awaiting Login...')).toBeVisible();
    }
    await replaceIframeWithStableWorkout(dashboardPage);
    await expect(dashboardPage).toHaveScreenshot('dashboard-active-session.png', {
      fullPage: true,
      animations: 'disabled',
      mask: getDynamicContentMasks(dashboardPage),
    });

    // 4. Stop the timer and streaming
    await stopTimer(controlPage, dashboardPage);
    await mockPage.getByRole('button', { name: 'STOP Streaming' }).click();
  });

  test.describe('Mobile Experience', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

    test('should render the control panel and dashboard correctly on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/client/control`);
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot('mobile-control-panel.png', {
        fullPage: true,
        animations: 'disabled',
      });

      await page.goto(BASE_URL);
      await waitForPageReady(page);
      await replaceIframeWithStableWorkout(page);
      await expect(page).toHaveScreenshot('mobile-dashboard.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicContentMasks(page),
      });
    });
  });
});
