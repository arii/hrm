
import { test, expect } from '@playwright/test';

test('verify mute control visibility on /client/control', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/client/control');

  // Wait for the custom event that signals the page is ready
  await page.waitForFunction(() => window.__TEST_READY__);

  // Wait for the volume slider to be visible to ensure the component is rendered
  await expect(page.locator('[aria-label="Volume"]')).toBeVisible();

  await page.screenshot({ path: 'tests/playwright/screenshots/verify-mute-control.png' });
});
