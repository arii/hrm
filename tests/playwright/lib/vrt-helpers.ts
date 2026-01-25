// File: tests/playwright/lib/vrt-helpers.ts
/**
 * Visual Regression Test (VRT) Helpers
 *
 * This module provides reusable functions to streamline VRTs, such as hiding
 * dynamic elements to ensure consistent screenshots.
 */
import type { Page } from '@playwright/test';

/**
 * Hides the HRM connection panel to prevent it from interfering with
 * visual regression tests.
 *
 * @param page - The Playwright Page object.
 */
export async function hideHrmConnectionPanel(page: Page): Promise<void> {
  await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="hrm-connection-panel"]');
    if (panel) {
      ;(panel as HTMLElement).style.display = 'none';
    }
  });
}
