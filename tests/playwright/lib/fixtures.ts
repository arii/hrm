// File: tests/playwright/lib/fixtures.ts
/**
 * Playwright Test Fixtures for predictable data states.
 *
 * This module provides custom fixtures to set up consistent test environments,
 * such as mocking WebSocket data to ensure tests run reliably without
 * depending on a live server connection.
 */
import { test as baseTest, Page } from '@playwright/test'

// Define the shape of our new fixtures
type MyFixtures = {
  mockWebSocket: (page: Page, mockData: Record<string, unknown>) => Promise<void>
}

// Extend the base test with our custom fixtures
export const test = baseTest.extend<MyFixtures>({
  mockWebSocket: async ({ page }, use) => {
    await use(async (page, mockData) => {
      await page.addInitScript(
        (data: Record<string, unknown>) => {
          window.__MOCK_WEB_SOCKET_DATA__ = data
        },
        [mockData]
      )
    })
  },
})

export { expect } from '@playwright/test'
