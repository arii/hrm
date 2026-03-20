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
  dashboardPage: async ({ browser, request }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // 1. Setup: Guarantee NextAuth.js session state
    await mockLoggedInSession(context)

    // 2. Setup: Purge Express/WebSocket server state
    await resetServerState(request)

    // 3. Freeze Material-UI animations and native scrollbars globally
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

    // Teardown
    await context.close()
  },

  controlPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Auth mock applies here as well
    await mockLoggedInSession(context)

    // Freeze animations
    await freezeUIForVRT(page)

    await use(page)

    // Teardown: Safely kill active timer broadcasts on the WebSocket connection
    try {
      await stopTimer(page)
    } catch (error) {
      console.warn(
        'Failed to stop timer during teardown, WS state may linger:',
        error
      )
    }
    await context.close()
  },

  mockPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Auth mock applies here as well
    await mockLoggedInSession(context)

    // Freeze animations
    await freezeUIForVRT(page)

    await use(page)
    await context.close()
  },

  connectPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Auth mock applies here as well
    await mockLoggedInSession(context)

    // Freeze animations
    await freezeUIForVRT(page)

    await use(page)
    await context.close()
  },
})

export { expect }
