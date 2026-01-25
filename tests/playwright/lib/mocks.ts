// File: tests/playwright/lib/mocks.ts
/**
 * Mocking Utilities for Playwright Tests
 *
 * This module provides functions for mocking network requests and other
 * dependencies to create stable and predictable test environments.
 */
import type { Page, BrowserContext } from '@playwright/test'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module-safe way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STABLE_WORKOUT_HTML = fs.readFileSync(path.join(__dirname, '../stable-workout-overlay.html'), 'utf-8');

/**
 * Intercepts requests to the Google Doc iframe and serves a stable,
 * static HTML response. This prevents test failures due to dynamic
 * or flaky iframe content.
 *
 * @param pageOrContext - The Playwright Page or BrowserContext object.
 */
export async function mockGoogleDocIframe(
  pageOrContext: Page | BrowserContext
): Promise<void> {
  await pageOrContext.route(
    '**/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true',
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: STABLE_WORKOUT_HTML,
      })
    }
  )
}
