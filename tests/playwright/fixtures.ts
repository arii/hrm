// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import {
  mockLoggedInSession,
  resetServerState,
  freezeUIForVRT,
  stopTimer,
} from './lib'

type PageFixtures = {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}

export const test = base.extend<PageFixtures>({
  dashboardPage: async ({ context, request }, use) => {
    const page = await context.newPage()

    await mockLoggedInSession(context)
    await resetServerState(request)
    await freezeUIForVRT(page)

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

    await use(page)
  },

  controlPage: async ({ context }, use) => {
    const page = await context.newPage()

    await mockLoggedInSession(context)
    await freezeUIForVRT(page)

    await use(page)

    try {
      await stopTimer(page)
    } catch (error) {
      console.warn(
        'Failed to stop timer during teardown, WS state may linger:',
        error
      )
    }
  },

  mockPage: async ({ context }, use) => {
    const page = await context.newPage()

    await mockLoggedInSession(context)
    await freezeUIForVRT(page)

    await use(page)
  },

  connectPage: async ({ context }, use) => {
    const page = await context.newPage()

    await mockLoggedInSession(context)
    await freezeUIForVRT(page)

    await use(page)
  },
})

export { expect }
