import { test, expect, Page } from '@playwright/test';
import { waitForPageReady } from './lib/waits';

/**
 * Starts a mock workout session by sending a 'WORK' phase message.
 * @param page The Playwright page object.
 */
const startMockWorkout = async (page: Page) => {
  await page.evaluate(() => {
    window.__TEST_CONTROLS__?.sendMockTimerMessage({
      timer: 30,
      currentPhase: 'WORK',
      cycle: 1,
      totalCycles: 5,
    });
  });
};

test.describe('Experimental Analytics Page', () => {
  test('should display live data during a session and stored data after', async ({ browser }) => {
    // 1. Open the connect page to establish a WebSocket connection and start a workout
    const connectPage = await browser.newPage();
    await connectPage.goto('/client/connect');
    await waitForPageReady(connectPage);

    // Start a mock workout. This will trigger the useLocalWorkoutBuffer to start recording.
    await startMockWorkout(connectPage);

    // 2. Open the experimental page in a new tab
    const experimentalPage = await browser.newPage();
    await experimentalPage.goto('/client/experimental');
    await waitForPageReady(experimentalPage);

    // 3. Verify "Status: Live" is shown
    await expect(experimentalPage.getByText('Status: Live')).toBeVisible();

    // 4. Simulate disconnecting by closing the original connect page
    await connectPage.close();

    // 5. Reload the experimental page
    await experimentalPage.reload();
    await waitForPageReady(experimentalPage);

    // 6. Verify it now shows "Status: Stored"
    await expect(experimentalPage.getByText('Status: Stored')).toBeVisible();

    // 7. Verify that some data has persisted by checking for the presence of the chart canvas
    await expect(experimentalPage.locator('canvas')).toBeVisible();

    // Clean up
    await experimentalPage.close();
  });
});
