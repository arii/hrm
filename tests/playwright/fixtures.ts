// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import { getBaseURL, waitForPageReady } from './lib'

const BASE_URL = getBaseURL()

type PageFixtures = {
  dashboardPage: Page
  controlPage: Page
  mockPage: Page
  connectPage: Page
}

type WorkerFixtures = {
  setupPages: void
}

export const test = base.extend<PageFixtures>({
  dashboardPage: async ({ context }, applyFixture) => {
    const page = await context.newPage()
    page.on('console', (msg) => {
      if (!msg.text().includes('DOCS_timing')) {
        console.log(`Console ${msg.type()}: ${msg.text()}`)
      }
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
