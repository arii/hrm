import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { registry } from '@/lib/openapi/registry'

extendZodWithOpenApi(z)

// --- Zod Schemas ---

export const SpotifyControlCommandSchema = z.object({
  command: z.enum([
    'PLAY',
    'PAUSE',
    'NEXT',
    'PREVIOUS',
    'SET_VOLUME',
    'TRANSFER_PLAYBACK',
  ]).openapi({
    description: 'The action to perform on the Spotify player',
    example: 'NEXT',
  }),
  volume: z.number().min(0).max(100).optional().openapi({
    description: 'Target volume percentage (0-100). Required for SET_VOLUME.',
    example: 50,
  }),
  deviceId: z.string().optional().openapi({
    description: 'Specific device ID to target. Defaults to active device.',
  }),
  playlistUri: z.string().optional().openapi({
    description: 'Spotify URI for context (e.g., playlist or album) when calling PLAY.',
    example: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  }),
}).openapi('SpotifyControlRequest')

export const SpotifyControlResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
}).openapi('SpotifyControlResponse')

// --- Route Registration ---

registry.registerPath({
  method: 'post',
  path: '/api/spotify/control',
  description: 'Control the centralized System/Gym Spotify Player',
  summary: 'Spotify Playback Control',
  security: [{ sessionAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyControlCommandSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Command executed successfully',
      content: {
        'application/json': {
          schema: SpotifyControlResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid command or missing parameters',
    },
    401: {
      description: 'Unauthorized (Not logged in)',
    },
    500: {
      description: 'Internal Server Error or Spotify Upstream Error',
    },
  },
})
