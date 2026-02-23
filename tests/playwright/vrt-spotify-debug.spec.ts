import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  mockLoggedInSession,
} from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Spotify Debug Page VRT', () => {
  test('initial state', async ({ dashboardPage, context }) => {
    // Mock session to avoid 401 errors
    await mockLoggedInSession(context)

    await setupMinimalVisualRegressionTest(dashboardPage, '/debug/spotify')
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'spotify-debug-page.png')
  })
})
