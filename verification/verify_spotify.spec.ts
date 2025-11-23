import { test, expect } from '@playwright/test';

test('verify spotify device selection', async ({ page }) => {
  // Mock the devices endpoint
  await page.route('/api/spotify/devices', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'device-1',
          name: 'My Laptop',
          is_active: true,
          type: 'Computer',
          volume_percent: 50,
          is_private_session: false,
          is_restricted: false,
        },
        {
          id: 'device-2',
          name: 'Phone',
          is_active: false,
          type: 'Smartphone',
          volume_percent: 80,
          is_private_session: false,
          is_restricted: false,
        },
      ]),
    });
  });

  await page.goto('http://127.0.0.1:3000/client/control');

  // Wait for the page to load
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'verification/spotify_devices.png' });
});
