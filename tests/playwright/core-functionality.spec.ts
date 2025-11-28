// tests/playwright/core-functionality.spec.ts
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getBaseURL } from '../../utils/urls';
import { waitForPageReady, replaceIframeWithStableWorkout } from './test-helpers';

const BASE_URL = getBaseURL();

test.describe('Core Functionality Visual Regression', () => {
  let context: BrowserContext;
  let dashboardPage: Page;
  let controlPage: Page;
  let mockPage: Page;
  let connectPage: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60000);
    context = await browser.newContext();
    [dashboardPage, controlPage, mockPage, connectPage] = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ]);

    await Promise.all([
      dashboardPage.goto(BASE_URL),
      controlPage.goto(`${BASE_URL}/client/control`),
      mockPage.goto(`${BASE_URL}/client/mock`),
      connectPage.goto(`${BASE_URL}/client/connect`),
    ]);

    await Promise.all([
      waitForPageReady(dashboardPage),
      waitForPageReady(controlPage),
      waitForPageReady(mockPage),
      waitForPageReady(connectPage),
    ]);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Dashboard - Initial Load', async () => {
    await replaceIframeWithStableWorkout(dashboardPage);
    await expect(dashboardPage).toHaveScreenshot('dashboard-initial-load.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Control Panel - Initial Load', async () => {
    await expect(controlPage).toHaveScreenshot('control-panel-initial-load.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mock HRM Client - Initial Load', async () => {
    await expect(mockPage).toHaveScreenshot('mock-hrm-client-initial-load.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Connect Page - Initial Load', async () => {
    await expect(connectPage).toHaveScreenshot('connect-page-initial-load.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
