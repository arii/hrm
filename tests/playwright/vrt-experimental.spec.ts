import { test } from './fixtures'
import { setupMinimalVisualRegressionTest } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Experimental Analytics Page VRT', () => {
  test('initial state', async ({ dashboardPage, useNativeTable }) => {
    await setupMinimalVisualRegressionTest(
      dashboardPage,
      '/client/experimental',
      { useNativeTable }
    )
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'experimental-analytics-page.png')
  })
})
