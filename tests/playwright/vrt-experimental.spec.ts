import { test } from './fixtures'
import { setupMinimalVisualRegressionTest, resetServerState } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Experimental Analytics Page VRT', () => {
  test.beforeEach(async ({ request }) => {
    await resetServerState(request)
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
