// File: tests/playwright/test-helpers.ts
/**
 * Shared Test Helpers: Reusable functions for consistent test setup
 */

const BASE_URL =
  process.env.BASE_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'

// Helper function to wait for page ready signal
export const waitForPageReady = async (page) => {
  try {
    await page.waitForFunction(
      () => {
        return window.__TEST_READY__ === true
      },
      { timeout: 10000 }
    )
  } catch (error) {
    await page.waitForTimeout(2000)
  }
}

// Helper function to replace iframe with stable workout content
export const replaceIframeWithStableWorkout = async (page) => {
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe')
    if (iframe) {
      iframe.src =
        'data:text/html;charset=utf-8,' +
        encodeURIComponent(`
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
  await page.waitForTimeout(1000)
}

// Setup function for visual regression tests
export const setupVisualRegressionTest = async ({
  dashboardPage,
  controlPage,
  mockPage,
  connectPage,
}) => {
  // Navigate all pages and wait for ready signals
  await dashboardPage.goto(BASE_URL)
  await controlPage.goto(`${BASE_URL}/phone`)
  await mockPage.goto(`${BASE_URL}/mock`)
  await connectPage.goto(`${BASE_URL}/connect`)

  // Wait for all pages to signal ready
  await Promise.all([
    waitForPageReady(dashboardPage),
    waitForPageReady(controlPage),
    waitForPageReady(mockPage),
    waitForPageReady(connectPage),
  ])

  // Replace iframe with stable content for dashboard
  await replaceIframeWithStableWorkout(dashboardPage)
}

// Setup function for comprehensive tests
export const setupComprehensiveTest = async ({ page, context }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })

  // Pre-warm all endpoints for comprehensive tests
  const dashboardTab = await context.newPage()
  const controlTab = await context.newPage()
  const mockTab = await context.newPage()
  const connectTab = await context.newPage()

  await Promise.all([
    dashboardTab.goto(BASE_URL),
    controlTab.goto(`${BASE_URL}/phone`),
    mockTab.goto(`${BASE_URL}/mock`),
    connectTab.goto(`${BASE_URL}/connect`),
  ])

  await Promise.all([
    waitForPageReady(dashboardTab),
    waitForPageReady(controlTab),
    waitForPageReady(mockTab),
    waitForPageReady(connectTab),
  ])

  // Close pre-warm tabs but keep connections alive
  await dashboardTab.close()
  await controlTab.close()
  await mockTab.close()
  await connectTab.close()
}

export async function setupCoreTest(page) {
  await waitForPageReady(page)
  await replaceIframeWithStableWorkout(page)
  await waitForWebSocketConnection(page)
}

export async function waitForWebSocketConnection(page) {
  await page.waitForFunction(
    () => {
      return window.__TEST_WEBSOCKET_READY__ === true
    },
    { timeout: 10000 }
  )
}

export { BASE_URL }
