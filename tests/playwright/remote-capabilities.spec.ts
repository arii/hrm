// File: tests/playwright/remote-capabilities.spec.ts
import { test, expect } from '@playwright/test';
import type { WebSocket } from '@playwright/test';
import { InitialStateSnapshotPayload, ServerMessage } from '../../types/websocket';

// Define mock credentials directly in the test file
const MOCK_USER_ID = 'mock-user-id';
const MOCK_ENCRYPTED_REFRESH_TOKEN = 'mock-encrypted-refresh-token';

// A more robust mock WebSocket server implementation
class MockWebSocketServer {
  private dashboard: WebSocket | null = null;
  private controller: WebSocket | null = null;
  private readonly initialState: ServerMessage;

  constructor() {
    const initialStatePayload: InitialStateSnapshotPayload = {
      timerData: {
        isRunning: false,
        currentPhase: 'IDLE',
        timeRemaining: 30,
        timeElapsed: 0,
        mode: 'TABATA',
        workDuration: 30,
        restDuration: 10,
        soundEventId: 0,
      },
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        isPlaying: true,
        devices: [
            { id: 'mock-device-1', name: 'Mock Device 1', is_active: true, volume_percent: 50 }
        ],
        volume: 50,
      },
      spotifyServiceInitialized: true,
      hrmData: [],
    };
    this.initialState = { type: 'INITIAL_STATE', payload: initialStatePayload };
  }

  addDashboard(ws: WebSocket) {
    this.dashboard = ws;
    ws.send(JSON.stringify(this.initialState));
    ws.on('framesent', (frame) => {
      // Relay messages from dashboard to controller if needed
      if (this.controller && this.controller.readyState() === 1) {
        this.controller.send(frame.payload);
      }
    });

    ws.on('close', () => {
      this.dashboard = null;
    });
  }

  addController(ws: WebSocket) {
    this.controller = ws;
    ws.send(JSON.stringify(this.initialState));
    ws.on('framesent', (frame) => {
      // Relay messages from controller to dashboard
       const message = JSON.parse(frame.payload.toString());
       if (message.type === 'SPOTIFY_COMMAND' && message.command === 'SET_VOLUME') {
         const volumeUpdate: ServerMessage = {
            type: 'SPOTIFY_UPDATE',
            payload: { ...this.initialState.payload.spotifyData, volume: message.volume }
         }
         if (this.dashboard && this.dashboard.readyState() === 1) {
            this.dashboard.send(JSON.stringify(volumeUpdate));
         }
       } else {
         if (this.dashboard && this.dashboard.readyState() === 1) {
            this.dashboard.send(frame.payload);
         }
       }
    });

    ws.on('close', () => {
      this.controller = null;
    });
  }
}


test.describe('Remote WebSocket Capabilities', () => {
  test('Controller commands should be relayed and update state', async ({ browser }) => {
    const server = new MockWebSocketServer();
    const dashboardContext = await browser.newContext();
    const controllerContext = await browser.newContext();

    await dashboardContext.route('**/ws', (route) => route.handle().then(ws => server.addDashboard(ws)));
    await controllerContext.route('**/ws', (route) => route.handle().then(ws => server.addController(ws)));

    const dashboardPage = await dashboardContext.newPage();
    const controllerPage = await controllerContext.newPage();

    // Navigate and set up mock authentication
    await dashboardPage.goto('/');
    await controllerPage.goto('/client/control');

    await dashboardPage.evaluate(
        `localStorage.setItem('ws_user_id', '${MOCK_USER_ID}')`
    );
    await dashboardPage.evaluate(
        `localStorage.setItem('ws_encrypted_refresh_token', '${MOCK_ENCRYPTED_REFRESH_TOKEN}')`
    );
    await controllerPage.evaluate(
        `localStorage.setItem('ws_user_id', '${MOCK_USER_ID}')`
    );
    await controllerPage.evaluate(
        `localStorage.setItem('ws_encrypted_refresh_token', '${MOCK_ENCRYPTED_REFRESH_TOKEN}')`
    );

    await dashboardPage.reload();
    await controllerPage.reload();

    // Wait for the UI to confirm connection
    await expect(dashboardPage.locator('[data-testid="connection-status-connected"]')).toBeVisible();
    await expect(controllerPage.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // **Test Case 1: Command Relay**
    // Listen for the 'Next' command being sent from the controller
    const frameSentPromise = controllerPage.waitForEvent('framesent', {
      predicate: (frame) => {
        const payload = JSON.parse(frame.payload.toString());
        return payload.type === 'SPOTIFY_COMMAND' && payload.command === 'NEXT';
      },
    });

    await controllerPage.getByTestId('spotify-next').click();
    await frameSentPromise; // Confirms the command was sent

    // **Test Case 2: State Synchronization**
    const dashboardVolumeSlider = dashboardPage.locator('[data-testid="spotify-controls-card"] .MuiSlider-root');
    const controllerVolumeSlider = controllerPage.locator('[data-testid="spotify-controls-card"] .MuiSlider-root');

    // Set a new volume on the controller
    await controllerVolumeSlider.fill('80');

    // The mock server will receive the SET_VOLUME command and broadcast a SPOTIFY_UPDATE.
    // Wait for the dashboard's slider to reflect the new volume.
    await expect(dashboardVolumeSlider).toHaveAttribute('aria-valuenow', '80');

    // Cleanup
    await dashboardContext.close();
    await controllerContext.close();
  });
});
