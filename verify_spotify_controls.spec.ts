import { test, expect } from '@playwright/test';

test('verify spotify controls mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 Pro
  await page.goto('http://localhost:3000/client/control/mock');

  // Wait for the mock client to load
  await page.waitForSelector('text=Spotify Controls');

  // Take a screenshot of the controls area
  await page.screenshot({ path: 'spotify-controls-mobile.png' });
});
