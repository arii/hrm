import { test } from './fixtures'
import { setupMinimalVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Experimental Analytics Page VRT', () => {
  test('initial state', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(
      dashboardPage,
      '/client/experimental'
    )
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'experimental-analytics-page.png')
  })
})
