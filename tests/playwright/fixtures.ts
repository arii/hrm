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
  /** Whether to use the native table view */
  useNativeTable?: boolean
}

export const test = base.extend<PageFixtures>({
  // Define the custom option with a default value
  useNativeTable: [undefined, { option: true }],

  dashboardPage: async ({ context, useNativeTable }, applyFixture) => {
    const page = await context.newPage()
    page.on('console', (msg) => {
      if (!msg.text().includes('DOCS_timing')) {
        console.log(`Console ${msg.type()}: ${msg.text()}`)
      }
    })

    // If useNativeTable is explicitly set, we could potentially inject it here
    // but navigations happen in the tests.
    // Instead, we can provide a decorated goto or just let tests handle it.

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
