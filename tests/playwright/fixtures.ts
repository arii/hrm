// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page, BrowserContext } from '@playwright/test'
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
    await cleanupVisualRegressionTest(page)
  } catch (error) {
    // Log teardown errors instead of silently swallowing them
    console.warn('⚠️ Teardown warning:', error)
  }
}

/**
 * Helper to create a page fixture with optional setup and automatic teardown.
 */
async function createPageFixture(
  { context }: { context: BrowserContext },
  applyFixture: (page: Page) => Promise<void>,
  setup?: (page: Page) => void
) {
  const page = await context.newPage()
  if (setup) {
    setup(page)
  }
  await applyFixture(page)
  await safePageTeardown(page)
}

export const test = base.extend<PageFixtures>({
  dashboardPage: async ({ context }, applyFixture) => {
    await createPageFixture({ context }, applyFixture, (page) => {
      page.on('console', (msg) => {
        const text = msg.text()
        if (text.includes('DOCS_timing')) return
        if (text.includes('An error occurred in the Server Components render'))
          return
        console.log(`Console ${msg.type()}: ${text}`)
      })
    })
  },

  controlPage: async ({ context }, applyFixture) => {
    await createPageFixture({ context }, applyFixture)
  },

  mockPage: async ({ context }, applyFixture) => {
    await createPageFixture({ context }, applyFixture)
  },

  connectPage: async ({ context }, applyFixture) => {
    await createPageFixture({ context }, applyFixture)
  },
})

export { expect }
