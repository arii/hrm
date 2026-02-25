import { test, expect } from '@playwright/test';

test('verify spotify controls mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/client/control');
  await page.waitForTimeout(5000); // Give more time
  await page.screenshot({ path: 'spotify-controls-mobile.png', fullPage: true });
});
