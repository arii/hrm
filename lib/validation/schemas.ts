import { z } from 'zod'

export const spotifyControlSchema = z.object({
  command: z.enum([
    'PLAY',
    'PAUSE',
    'NEXT',
    'PREVIOUS',
    'SET_VOLUME',
    'TRANSFER_PLAYBACK',
  ]),
  // Optionally validate additional fields for each command
  volume: z.number().min(0).max(100).optional(),
  deviceId: z.string().optional(),
  playlistUri: z.string().optional(),
})
