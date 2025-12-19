// File: tests/playwright/storybook-visual-regression.spec.ts
import { test, expect } from '@playwright/test';

const STORYBOOK_URL = 'http://127.0.0.1:6006';

// Helper function to get the Storybook iframe URL
const getStorybookUrl = (storyId: string) => `${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`;

test.describe('Storybook Visual Regression Tests', () => {

  test('Button Component - Contained', async ({ page }) => {
    await page.goto(getStorybookUrl('mui-button--contained'));
    await expect(page.locator('#storybook-root')).toBeVisible();
    await expect(page).toHaveScreenshot('button-contained.png');
  });

  test('Button Component - Outlined', async ({ page }) => {
    await page.goto(getStorybookUrl('mui-button--outlined'));
    await expect(page.locator('#storybook-root')).toBeVisible();
    await expect(page).toHaveScreenshot('button-outlined.png');
  });

  test('Button Component - Text', async ({ page }) => {
    await page.goto(getStorybookUrl('mui-button--text'));
    await expect(page.locator('#storybook-root')).toBeVisible();
    await expect(page).toHaveScreenshot('button-text.png');
  });

  test('Button Component - All Variants', async ({ page }) => {
    await page.goto(getStorybookUrl('mui-button--all-variants'));
    await expect(page.locator('#storybook-root')).toBeVisible();
    await expect(page).toHaveScreenshot('button-all-variants.png');
  });

  test('Button Component - All Sizes', async ({ page }) => {
    await page.goto(getStorybookUrl('mui-button--all-sizes'));
    await expect(page.locator('#storybook-root')).toBeVisible();
    await expect(page).toHaveScreenshot('button-all-sizes.png');
  });

});
