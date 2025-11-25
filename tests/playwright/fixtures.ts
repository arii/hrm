// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import { BASE_URL, waitForPageReady } from './test-helpers'

type PageFixtures = {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}

type WorkerFixtures = {
  setupPages: void
}

export const test = base.extend<PageFixtures, WorkerFixtures>({
  setupPages: [
    async ({ browser }, use) => {
      const context = await browser.newContext()
      const warmupPage = await context.newPage()

      console.log('🔥 Warming up server endpoints...')

      // Wait for server to be ready with retries
      let retries = 30 // 30 retries = 30 seconds max wait
      let serverReady = false
      while (retries > 0 && !serverReady) {
        try {
          await warmupPage.goto(BASE_URL, { timeout: 2000 })
          serverReady = true
        } catch (e) {
          retries--
          if (retries === 0) throw new Error(`Server not ready at ${BASE_URL} after 30 seconds`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      await waitForPageReady(warmupPage)

      await warmupPage.goto(`${BASE_URL}/client/control`)
      await waitForPageReady(warmupPage)

      await warmupPage.goto(`${BASE_URL}/client/mock`)
      await waitForPageReady(warmupPage)

      await warmupPage.goto(`${BASE_URL}/client/connect`)
      await waitForPageReady(warmupPage)

      await context.close()
      console.log('✅ Server endpoints warmed up')

      await use()
    },
    { scope: 'worker' },
  ],

  dashboardPage: async ({ context, setupPages: _setupPages }, use) => {
    const page = await context.newPage()
    page.on('console', (msg) => {
      if (!msg.text().includes('DOCS_timing')) {
        console.log(`Console ${msg.type()}: ${msg.text()}`)
      }
    })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await use(page)
    // Cleanup: close the page after test completes
    await page.close().catch(() => {}) // Ignore errors if already closed
  },

  controlPage: async ({ context, setupPages: _setupPages }, use) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(page)
    await use(page)
    await page.close().catch(() => {})
  },

  mockPage: async ({ context, setupPages: _setupPages }, use) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`${BASE_URL}/client/mock`)
    await waitForPageReady(page)
    await use(page)
    await page.close().catch(() => {})
  },

  connectPage: async ({ context, setupPages: _setupPages }, use) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`${BASE_URL}/client/connect`)
    await waitForPageReady(page)
    await use(page)
    await page.close().catch(() => {})
  },
})

export { expect }
