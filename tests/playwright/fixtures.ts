// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import { mockMultipleHrDevices } from './lib/mocks'

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
      if (text.includes('An error occurred in the Server Components render')) {
        return
      }

      console.log(`Console ${msg.type()}: ${text}`)
    })
    await applyFixture(page)

    // Teardown: Clear mock HR devices to prevent state pollution between tests
    try {
      await mockMultipleHrDevices(page, [])
    } catch (error) {
      // Ignore errors if the page is already closed or navigated away
      console.warn('Failed to clear mock HR devices during teardown:', error)
    }
  },

  controlPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await applyFixture(page)

    // Teardown
    try {
      await mockMultipleHrDevices(page, [])
    } catch (error) {
      console.warn('Failed to clear mock HR devices during teardown:', error)
    }
  },

  mockPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await applyFixture(page)

    // Teardown
    try {
      await mockMultipleHrDevices(page, [])
    } catch (error) {
      console.warn('Failed to clear mock HR devices during teardown:', error)
    }
  },

  connectPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    await applyFixture(page)

    // Teardown
    try {
      await mockMultipleHrDevices(page, [])
    } catch (error) {
      console.warn('Failed to clear mock HR devices during teardown:', error)
    }
  },
})

export { expect }
