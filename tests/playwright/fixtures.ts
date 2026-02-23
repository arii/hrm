// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

type PageFixtures = {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}

export const test = base.extend<PageFixtures>({
  dashboardPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    page.on('console', (msg) => {
      const text = msg.text()
      // Filter out expected noise
      if (text.includes('DOCS_timing')) return

      // Filter out expected server-side render error during the ErrorFallback UI test
      if (
        text.includes(
          'An error occurred in the Server Components render. The specific message is omitted in production builds'
        )
      ) {
        return
      }

      console.log(`Console ${msg.type()}: ${text}`)
    })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
  },

  controlPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
  },

  mockPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
  },

  connectPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await applyFixture(page)
  },
})

export { expect }
