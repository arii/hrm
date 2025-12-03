// File: lib/validation/schemas.ts
import { z } from 'zod'

// Shared constants
const VALID_COMMANDS = [
  'PLAY',
  'PAUSE',
  'NEXT',
  'PREVIOUS',
  'SET_VOLUME',
  'TRANSFER_PLAYBACK',
] as const

/**
 * Schema for POST /api/spotify/control
 * Validates the body of a request to control Spotify playback.
 */
export const spotifyControlSchema = z.object({
  command: z.enum(VALID_COMMANDS),
  volume: z.number().min(0).max(100).optional(),
  deviceId: z.string().optional(),
}).refine(
  (data) => {
    if (data.command === 'SET_VOLUME') {
      return data.volume !== undefined
    }
    return true
  },
  {
    message: "Volume is required for the 'SET_VOLUME' command.",
    path: ['volume'],
  }
).refine(
    (data) => {
        if (data.command === 'TRANSFER_PLAYBACK') {
            return data.deviceId !== undefined
        }
        return true
    },
    {
        message: "Device ID is required for the 'TRANSFER_PLAYBACK' command.",
        path: ['deviceId'],
    }
)

/**
 * Schema for GET /api/spotify/playlists/search
 * Validates the query parameters of a request to search for playlists.
 */
export const playlistSearchSchema = z.object({
  q: z.string().min(1).max(100),
})
