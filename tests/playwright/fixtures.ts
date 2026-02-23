// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import { cleanupVisualRegressionTest } from './lib'

type PageFixtures = {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}

/**
 * Safely cleans up a page after a test, clearing HR devices and stopping timers.
 * Swallows errors to prevent teardown failures from masking test results.
 */
async function safePageTeardown(page: Page) {
  try {
    if (!page.isClosed()) {
      await cleanupVisualRegressionTest(page)
    }
  } catch {
    // Teardown errors are logged but shouldn't fail the test
  }
}

export const test = base.extend<PageFixtures>({
  dashboardPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('DOCS_timing')) return
      if (text.includes('An error occurred in the Server Components render'))
        return
      console.log(`Console ${msg.type()}: ${text}`)
    })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
    await safePageTeardown(page)
  },

  controlPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
    await safePageTeardown(page)
  },

  mockPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
    await safePageTeardown(page)
  },

  connectPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
    await safePageTeardown(page)
  },
})

export { expect }
