// File: tests/playwright/lib/mocks.ts
/**
 * Mocking Utilities for Playwright Tests
 *
 * This module provides functions for mocking network requests and other
 * dependencies to create stable and predictable test environments.
 */
import type { Page, BrowserContext } from '@playwright/test'
import type {
  HrmData,
  SpotifyData as SpotifyPlaybackState,
} from '../../../types/websocket'

const STABLE_WORKOUT_HTML = `
  <!DOCTYPE html>
  <html><head><style>
  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
  h3 { margin: 0 0 10px 0; color: #333; }
  p { margin: 5px 0; font-size: 14px; }
  </style></head><body>
  <p><strong>Sample Workout Plan</strong></p>
  <table><tr>
  <td><h3>30/10 x 3</h3><p>3 way crunch</p><p>Dead bug</p><p>Plank variations</p></td>
  <td><h3>Tabata</h3><p>Band h. Bridge</p><p>Band p. Squat</p><p>Band hydrants</p></td>
  <td><h3>Complex 5x5</h3><p>RDL</p><p>High pull</p><p>1 ½ squat</p></td>
  <td><h3>3x10</h3><p>Alt box ch press</p><p>Single Hip thrust</p></td>
  <td><h3>3 x 12</h3><p>Kb curl</p><p>Tricep planks</p><p>Butterfly bridge</p></td>
  </tr></table>
  <p><a href="#">Previous workouts</a></p>
  </body></html>
`

/**
 * Intercepts requests to the Google Doc iframe and serves a stable,
 * static HTML response. This prevents test failures due to dynamic
 * or flaky iframe content.
 *
 * @param pageOrContext - The Playwright Page or BrowserContext object.
 * @param html - Optional custom HTML body for the mock.
 */
export async function mockGoogleDocIframe(
  pageOrContext: Page | BrowserContext,
  html: string = STABLE_WORKOUT_HTML
): Promise<void> {
  // Pattern to match any Google Doc publication URL with embedded=true
  await pageOrContext.route(
    /.*docs\.google\.com\/document\/d\/e\/.*\/pub\?embedded=true.*/,
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: html,
      })
    }
  )
}

/**
 * Mocks the workout API response for stable VRT.
 *
 * @param pageOrContext - The Playwright Page or BrowserContext object.
 * @param data - Optional custom workout data.
 */
export async function mockWorkoutApi(
  pageOrContext: Page | BrowserContext,
  data: { headers: string[] } = {
    headers: ['PHASE', 'INTENSITY', 'DURATION', 'NOTES'],
  }
): Promise<void> {
  await pageOrContext.route('**/api/workout*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
}

/**
 * Simulates multiple HR devices by dispatching a WebSocket message.
 *
 * @param page - The Playwright Page object.
 * @param devices - Array of HR device data.
 */
export async function mockMultipleHrDevices(
  page: Page,
  devices: HrmData[]
): Promise<void> {
  await page.evaluate((payload) => {
    // @ts-expect-error - __TEST_CONTROLS__ is added at runtime
    window.__TEST_CONTROLS__?.dispatch({
      type: 'HRM_UPDATE',
      payload,
    })
  }, devices)
}

/**
 * Simulates Spotify playback state by dispatching a WebSocket message.
 *
 * @param page - The Playwright Page object.
 * @param state - Partial Spotify playback state.
 */
export async function mockSpotifyPlaybackState(
  page: Page,
  state: Partial<SpotifyPlaybackState>
): Promise<void> {
  const defaultState: SpotifyPlaybackState = {
    devices: [],
    playback: {
      track: {
        id: 'track-1',
        name: 'Mock Track',
        artist: 'Mock Artist',
        albumName: 'Mock Album',
        albumArtUrl: 'https://via.placeholder.com/150',
      },
      is_playing: true,
      volume_percent: 50,
      isMuted: false,
      progress_ms: 0,
    },
  }

  // Deep merge state into defaultState to allow overriding nested playback properties
  const payload = {
    ...defaultState,
    ...state,
    playback: state.playback
      ? {
          ...defaultState.playback,
          ...state.playback,
          track: state.playback.track
            ? { ...defaultState.playback.track, ...state.playback.track }
            : defaultState.playback.track,
        }
      : defaultState.playback,
  }

  await page.evaluate((payload) => {
    // @ts-expect-error - __TEST_CONTROLS__ is added at runtime
    window.__TEST_CONTROLS__?.dispatch({
      type: 'SPOTIFY_UPDATE',
      payload,
    })
  }, payload)
}

/**
 * Mocks the NextAuth session to simulate a logged-in user.
 *
 * @param context - The Playwright BrowserContext object.
 */
export async function mockLoggedInSession(
  context: BrowserContext
): Promise<void> {
  // Mock the session endpoint
  await context.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://via.placeholder.com/150',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        accessToken: 'mock-access-token',
      }),
    })
  })

  // Mock the Spotify access token endpoint as it's required for the control panel
  await mockSpotifyAccessToken(context)
}

/**
 * Mocks the Spotify access token endpoint.
 *
 * @param context - The Playwright BrowserContext object.
 * @param accessToken - The mock access token to return.
 */
export async function mockSpotifyAccessToken(
  context: BrowserContext,
  accessToken: string = 'mock-spotify-access-token'
): Promise<void> {
  await context.route('**/api/spotify/access-token', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken,
      }),
    })
  })
}
