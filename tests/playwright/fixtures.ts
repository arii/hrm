// File: tests/playwright/fixtures.ts
/**
 * Playwright Test Fixtures: Pre-load all HRM endpoints and setup pages
 */
import { test as base, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'

// Helper function to wait for page ready signal
const waitForPageReady = async (page) => {
  try {
    await page.waitForFunction(() => {
      return window.__TEST_READY__ === true
    }, { timeout: 10000 })
  } catch (error) {
    await page.waitForTimeout(2000)
  }
}

// Helper function to replace iframe with stable workout content
const replaceIframeWithStableWorkout = async (page) => {
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe')
    if (iframe) {
      iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
        <!DOCTYPE html>
        <html><head><style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        h3 { margin: 0 0 10px 0; color: #333; }
        p { margin: 5px 0; font-size: 14px; }
        </style></head><body>
        <p><strong>Sample Workout Plan</strong></p>
        <table><tr>
        <td><h3>30/10 x 3</h3><p>3 way crunch</p><p>Dead bug</p><p>Plank variations</p></td>
        <td><h3>Tabata</h3><p>Band h. Bridge</p><p>Band p. Squat</p><p>Band hydrants</p></td>
        <td><h3>Complex 5x5</h3><p>RDL</p><p>High pull</p><p>1 ½ squat</p></td>
        <td><h3>3x10</h3><p>Alt box ch press</p><p>Single Hip thrust</p></td>
        <td><h3>3 x 12</h3><p>Kb curl</p><p>Tricep planks</p><p>Butterfly bridge</p></td>
        </tr></table>
        <p><a href="#">Previous workouts</a></p>
        </body></html>
      `)
    }
  })
  await page.waitForTimeout(500)
}

// Define fixture types
type HrmFixtures = {
  dashboardPage: any
  controlPage: any
  mockPage: any
  connectPage: any
  setupPages: void
}

// Create test fixture with pre-loaded pages
export const test = base.extend<HrmFixtures>({
  // Setup all pages fixture
  setupPages: [async ({ browser }, use) => {
    // Pre-load all endpoints to warm up the server
    const context = await browser.newContext()
    const warmupPage = await context.newPage()
    
    console.log('🔥 Warming up server endpoints...')
    
    // Warm up all routes
    await warmupPage.goto(BASE_URL)
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
  }, { scope: 'worker' }],

  // Dashboard page fixture
  dashboardPage: async ({ context, setupPages }, use) => {
    const page = await context.newPage()
    page.on('console', msg => {
      if (!msg.text().includes('DOCS_timing')) {
        console.log(`Console ${msg.type()}: ${msg.text()}`)
      }
    })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await use(page)
  },

  // Control panel page fixture
  controlPage: async ({ context, setupPages }, use) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await use(page)
  },

  // Mock HRM page fixture
  mockPage: async ({ context, setupPages }, use) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await use(page)
  },

  // Connect page fixture
  connectPage: async ({ context, setupPages }, use) => {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await use(page)
  },
})

export { expect }