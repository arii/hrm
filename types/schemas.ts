// types/schemas.ts
import { z } from 'zod'
import { SpotifyCommandMessageSchema } from './websocket'

// Zod schema for HrmStreamData
export const HrmStreamDataSchema = z.object({
  clientId: z.string(),
  value: z.number(),
  maxHr: z.number(),
  name: z.string().optional(),
  age: z.number().optional(),
  calories: z.number(),
})

// Zod schema for TimerData
export const TimerDataSchema = z.object({
  isRunning: z.boolean(),
  currentPhase: z.enum(['IDLE', 'PREPARE', 'WORK', 'REST', 'COOLDOWN', 'RUNNING']),
  timeRemaining: z.number(),
  timeElapsed: z.number(),
  caloriesBurned: z.number(),
  mode: z.enum(['STOPWATCH', 'TABATA']),
  workDuration: z.number(),
  restDuration: z.number(),
  soundToPlay: z.enum(['WORK', 'REST', 'COUNTDOWN']).optional(),
  soundEventId: z.number(),
})

// Zod schema for SpotifyDevice
export const SpotifyDeviceSchema = z.object({
  id: z.string(),
  is_active: z.boolean(),
  is_private_session: z.boolean(),
  is_restricted: z.boolean(),
  name: z.string(),
  type: z.string(),
  volume_percent: z.number(),
})

// Zod schema for SpotifyPlaybackState
export const SpotifyPlaybackStateSchema = z.object({
  trackId: z.string().nullable(),
  trackName: z.string(),
  artist: z.string(),
  albumName: z.string(),
  albumArtUrl: z.string(),
  isPlaying: z.boolean(),
  devices: z.array(SpotifyDeviceSchema),
  volume: z.number(),
  isMuted: z.boolean(),
})

// Zod schema for InitialStateSnapshotPayload
export const InitialStateSnapshotPayloadSchema = z.object({
  hrmData: z.array(HrmStreamDataSchema),
  timerData: TimerDataSchema,
  spotifyData: SpotifyPlaybackStateSchema,
  spotifyServiceInitialized: z.boolean().optional(),
})

// Zod schema for ActiveAlert
export const ActiveAlertSchema = z.object({
    clientId: z.string(),
    code: z.enum(['HRM_STALE', 'BAD_PLACEMENT']),
    message: z.string(),
    severity: z.enum(['warning', 'error']),
    timestamp: z.number(),
})

// Zod schema for SpotifyExecutionMessage
export const SpotifyExecutionMessageSchema = z.object({
  type: z.literal('EXECUTE_SPOTIFY'),
  payload: SpotifyCommandMessageSchema,
})

// Zod schema for ServerMessage using discriminated union
export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INITIAL_STATE'),
    payload: InitialStateSnapshotPayloadSchema,
  }),
  z.object({ type: z.literal('HRM_UPDATE'), payload: z.array(HrmStreamDataSchema) }),
  z.object({ type: z.literal('TIMER_UPDATE'), payload: TimerDataSchema }),
  z.object({ type: z.literal('SPOTIFY_UPDATE'), payload: SpotifyPlaybackStateSchema }),
  z.object({ type: z.literal('ACTIVE_ALERTS_UPDATE'), payload: z.array(ActiveAlertSchema) }),
  z.object({ type: z.literal('SPOTIFY_SERVICE_INIT_UPDATE'), payload: z.boolean() }),
  z.object({ type: z.literal('PONG') }),
  SpotifyExecutionMessageSchema,
])
