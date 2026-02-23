import { test } from './fixtures'
import { setupMinimalVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Spotify Selection Page VRT', () => {
  test('initial list state', async ({ dashboardPage, useNativeTable }) => {
    await setupMinimalVisualRegressionTest(
      dashboardPage,
      '/client/spotify-selection',
      { useNativeTable }
    )
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'spotify-selection-page.png')
  })
})
