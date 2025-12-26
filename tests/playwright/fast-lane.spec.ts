// tests/playwright/fast-lane.spec.ts
import { test, expect } from '@playwright/test';

// A more complete and realistic initial state
const INITIAL_STATE = {
  hrmData: [],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE',
    timeRemaining: 30, // Default work duration
    timeElapsed: 0,
    caloriesBurned: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
    targetTime: 0,
  },
  spotifyData: {
    trackId: null,
    trackName: 'Awaiting Login...',
    artist: '',
    albumName: '',
    albumArtUrl: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
};

test.describe.skip('Fast Lane UI Tests (WebSocket Mocking)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session to bypass the authentication loading screen
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2099-12-31T23:59:59.999Z',
        }),
      });
    });
  });

  test('Timer displays WORK phase immediately on WebSocket message', async ({ page }) => {
    await page.route('ws://127.0.0.1:3000/ws', async route => {
      const ws = await route.handle();
      ws.on('framereceived', async (frame) => {
        const message = JSON.parse(frame.payload.toString());
        if (message.type === 'GET_STATE') {
          ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload: INITIAL_STATE }));
          ws.send(JSON.stringify({
            type: 'TIMER_UPDATE',
            payload: {
              currentPhase: 'WORK',
              timeRemaining: 20,
              isRunning: true,
            }
          }));
        }
      });
      ws.on('close', () => console.log('WebSocket mocked and closed.'));
    });

    await page.goto('/');

    // Use a more robust assertion that waits for the element to be ready
    await expect(page.locator('[data-testid="timer-phase"]')).toHaveText('WORK', { timeout: 10000 });
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText('00:20');
  });

  test('Timer displays REST phase immediately on WebSocket message', async ({ page }) => {
    await page.route('ws://127.0.0.1:3000/ws', async route => {
      const ws = await route.handle();
      ws.on('framereceived', async (frame) => {
        const message = JSON.parse(frame.payload.toString());
        if (message.type === 'GET_STATE') {
          ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload: INITIAL_STATE }));
          ws.send(JSON.stringify({
            type: 'TIMER_UPDATE',
            payload: {
              currentPhase: 'REST',
              timeRemaining: 10,
              isRunning: true,
            }
          }));
        }
      });
      ws.on('close', () => console.log('WebSocket mocked and closed.'));
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="timer-phase"]')).toHaveText('REST', { timeout: 10000 });
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText('00:10');
  });
});
