import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  mockLoggedInSession,
  mockSpotifyPlaylists,
} from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Spotify Selection Page VRT', () => {
  test('initial list state', async ({
    dashboardPage,
    context,
    useNativeTable,
  }) => {
    // Mock authentication and Spotify data to avoid 401 errors
    await mockLoggedInSession(context)
    await mockSpotifyPlaylists(context)

    await setupMinimalVisualRegressionTest(
      dashboardPage,
      '/client/spotify-selection',
      { useNativeTable }
    )
    await waitForPageReady(dashboardPage)
    await takeScreenshot(dashboardPage, 'spotify-selection-page.png')
  })
})
