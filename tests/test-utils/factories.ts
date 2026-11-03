import { IncomingMessage } from 'http'
import { TLSSocket } from 'tls'
import { v4 as uuidv4 } from 'uuid'
import { SpotifyDevice } from '@/types/core'
import { SpotifyData } from '@/types/websocket'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import {
  UserProfile,
  UserPhysicalProfile,
  WorkoutSession,
  HeartRateDataPoint,
} from '@/types/core'

// --- Request Factory ---
/**
 * Creates a mock IncomingMessage object for use in tests.
 * @param url - The request URL.
 * @param headers - Request headers.
 * @param socket - A mock socket object.
 * @returns A mock IncomingMessage.
 */
export const createMockRequest = (
  url = '/?clientId=test-client',
  headers: Record<string, string> = {},
  socket: Record<string, unknown> = {}
): IncomingMessage => {
  const baseSocket = {
    remoteAddress: '127.0.0.1',
    ...socket,
  }
  // This is a more robust way to mock a TLSSocket for `instanceof` checks
  if (socket instanceof TLSSocket) {
    Object.setPrototypeOf(baseSocket, TLSSocket.prototype)
  }

  return {
    url,
    headers: {
      host: 'localhost:3000',
      'user-agent': 'jest-test',
      origin: 'http://localhost:3000',
      ...headers,
    },
    socket: baseSocket,
  } as unknown as IncomingMessage // Type assertion for test purposes
}

// --- Spotify Factories ---
/**
 * Creates a mock SpotifyDevice object for use in tests.
 * @param overrides - Partial<SpotifyDevice> to override default values.
 * @returns A mock SpotifyDevice.
 */
export const createMockSpotifyDevice = (
  overrides: Partial<SpotifyDevice> = {}
): SpotifyDevice => ({
  id: 'mock-device-id',
  is_active: false,
  is_private_session: false,
  is_restricted: false,
  name: 'Mock Device',
  type: 'Computer',
  volume_percent: 50,
  ...overrides,
})

/**
 * Creates a mock SpotifyData object for use in tests.
 * @param overrides - Partial<SpotifyData> to override default values.
 * @returns A mock SpotifyData.
 */
export const createMockSpotifyData = (
  overrides: Partial<SpotifyData> = {}
): SpotifyData => ({
  devices: [
    createMockSpotifyDevice({ id: '1', name: 'Device 1', is_active: true }),
    createMockSpotifyDevice({
      id: 'hrm-player',
      name: HRM_WEB_PLAYER_NAME,
      is_active: false,
    }),
  ],
  playback: {
    track: {
      id: 'mock-track-id',
      name: 'Mock Track',
      artist: 'Mock Artist',
      albumName: 'Mock Album',
      albumArtUrl: 'http://localhost/mock-art.jpg',
    },
    is_playing: true,
    isMuted: false,
    volume_percent: 50,
    progress_ms: 0,
  },
  ...overrides,
})

// --- User Identity Factory ---
export const createValidUserProfile = (
  overrides: Partial<UserProfile> = {}
): UserProfile => ({
  id: uuidv4(),
  username: 'johndoe',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// --- User Physical Profile Factory ---
export const createValidUserPhysicalProfile = (
  overrides: Partial<UserPhysicalProfile> = {}
): UserPhysicalProfile => ({
  userId: uuidv4(),
  age: 30,
  weight: 75, // 75kg
  gender: 'MALE',
  unitSystem: 'METRIC',
  ...overrides,
})

// --- Workout Session Factory ---
export const createValidWorkoutSession = (
  overrides: Partial<WorkoutSession> = {}
): WorkoutSession => ({
  id: uuidv4(),
  userId: uuidv4(),
  startedAt: new Date().toISOString(),
  endedAt: null,
  notes: 'Test workout session',
  ...overrides,
})

// --- Heart Rate Data Point Factory ---
export const createHeartRateDataPoint = (
  overrides: Partial<HeartRateDataPoint> = {}
): HeartRateDataPoint => ({
  id: uuidv4(),
  workoutSessionId: uuidv4(),
  timestamp: Date.now(),
  heartRate: 120, // default bpm
  ...overrides,
})
