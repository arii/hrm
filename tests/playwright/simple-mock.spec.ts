
import { test, expect } from '@playwright/test';

test('Body element has the correct data-timer-phase attribute', async ({ page }) => {
  await page.route('**/api/workout**', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        title: 'Mocked Workout',
        doc: '<p>Mocked workout content</p>',
      }),
    });
  });

  await page.route('ws://127.0.0.1:3000/ws', async (route) => {
    const ws = await route.newWebSocket();
    ws.on('framereceived', (data) => {
      if (data.payload.toString().includes('GET_STATE')) {
        ws.send(JSON.stringify({
          type: 'INITIAL_STATE',
          payload: {
            timerData: {
              phase: 'WORK',
              timeRemaining: 20,
              mode: 'TABATA',
            },
            spotifyData: {},
            hrmData: [],
          },
        }));
      }
    });
  });

  await page.goto('/');

  await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
  await expect(page.locator('[data-testid="timer-display"]')).toHaveAttribute('data-timer-phase', 'WORK');
});
