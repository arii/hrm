
import { test, expect } from '@playwright/test';

test.describe('Timer Controls', () => {
  test('should display "Timer Stopped" when the timer is not running', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/client/control');
    await expect(page.getByText('Timer Stopped')).toBeVisible();
    await page.screenshot({ path: '/app/verification/timer-stopped.png' });
  });
});
