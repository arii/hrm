import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  mockLoggedInSession,
  mockSpotifyPlaylists,
} from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

test.describe('Spotify Selection Page VRT', () => {
  test('initial state', async ({ dashboardPage, context }) => {
    // Mock authentication and Spotify data to avoid 401 errors
    await mockLoggedInSession(context)
    await mockSpotifyPlaylists(context)

    await setupMinimalVisualRegressionTest(
      dashboardPage,
      '/client/spotify-selection'
    )
    await waitForPageReady(dashboardPage)

    // Mask the search input as it now uses MUI Autocomplete, which causes
    // layout shifts and differs between local and CI environments.
    const searchInput = dashboardPage.locator('.MuiAutocomplete-root')

    await takeScreenshot(dashboardPage, 'spotify-selection-page.png', {
      screenshotOptions: {
        mask: [searchInput],
      },
    })
  })
})
