import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  resetServerState,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Experimental Analytics Page VRT', () => {
  test.afterEach(async ({ page }) => {
    await resetServerState(page)
  })

  test('initial state', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(
      dashboardPage,
      '/client/experimental'
    )
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'experimental-analytics-page.png')
  })
})
