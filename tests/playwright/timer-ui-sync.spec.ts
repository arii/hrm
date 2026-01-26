import { test, expect } from '@playwright/test';

test.describe('Timer UI Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/client/control');
    await expect(page.locator('text=Server: Connected')).toBeVisible({ timeout: 15000 });

    const stopButton = page.locator('[data-testid="stop-timer-button"]');
    try {
      await expect(stopButton).toBeVisible({ timeout: 2000 });
      await stopButton.click();
      await expect(page.locator('[data-testid="start-timer-button"]')).toBeVisible();
    } catch (e) {
      // Timer is already stopped.
    }
  });

  test('should correctly reflect the initial state of the timer', async ({ page }) => {
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-timer-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="stop-timer-button"]')).not.toBeVisible();
  });

  test('should optimistically update UI to "running" on start button click', async ({ page }) => {
    await page.click('[data-testid="start-timer-button"]');
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible();
    await expect(page.locator('[data-testid="stop-timer-button"]')).toBeVisible();
  });

  test('should optimistically update UI to "stopped" on stop button click', async ({ page }) => {
    await page.click('[data-testid="start-timer-button"]');
    await expect(page.locator('[data-testid="timer-running"]')).toBeVisible();
    await page.click('[data-testid="stop-timer-button"]');
    await expect(page.locator('[data-testid="timer-stopped"]')).toBeVisible();
  });
});
