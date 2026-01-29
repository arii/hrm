import { test, expect } from '@playwright/test';
import { getBaseURL } from '../../utils/urls';
import { waitForAuthRedirect } from './lib/auth';

const BASE = getBaseURL();

test.describe('Spotify Playlist Verification', () => {
  test('should display playlist tracks after selection', async ({ page }) => {
    await page.goto(BASE);

    // Click the login button
    await page.getByText(/login with spotify/i).click();

    // Wait for the Spotify login page to load
    await page.waitForURL('https://accounts.spotify.com/**');

    // NOTE: This test requires manual intervention to log in to Spotify.
    // In a real CI/CD environment, you would use a mock Spotify login
    // or a pre-authenticated state.

    // After manual login, wait for the redirect back to the app
    await waitForAuthRedirect(page);

    // Navigate to the Spotify selection page
    await page.goto(`${BASE}/client/spotify-selection`);

    // Click on a playlist
    await page.getByText('Good Vibes').click();

    // Verify that the tracks are visible
    await expect(page.getByText('Playlist Tracks')).toBeVisible();
    await expect(page.locator('li:has-text("Good News")')).toBeVisible();
  });
});
