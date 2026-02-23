import { test } from './fixtures'
import { setupMinimalVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Spotify Debug Page VRT', () => {
  test('initial state', async ({ dashboardPage, useNativeTable }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/debug/spotify', {
      useNativeTable,
    })
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'spotify-debug-page.png')
  })
})
