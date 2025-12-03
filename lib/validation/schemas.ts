// File: lib/validation/schemas.ts
import { z } from 'zod'

/**
 * @description Zod schema for validating Spotify control commands.
 * Ensures that the command is a valid Spotify command, and that
 * the volume is provided when the command is SET_VOLUME.
 */
export const SpotifyControlSchema = z
  .object({
    command: z.enum([
      'PLAY',
      'PAUSE',
      'NEXT',
      'PREVIOUS',
      'SET_VOLUME',
      'TRANSFER_PLAYBACK',
    ]),
    volume: z.number().min(0).max(100).optional(),
    deviceId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.command === 'SET_VOLUME' && typeof data.volume !== 'number') {
      ctx.addIssue({
        code: 'custom',
        message: 'Volume is required for SET_VOLUME command',
        path: ['volume'],
      })
    }
    if (data.command === 'TRANSFER_PLAYBACK' && !data.deviceId) {
        ctx.addIssue({
            code: 'custom',
            message: 'Device ID is required for TRANSFER_PLAYBACK command',
            path: ['deviceId']
        })
    }
  })

export type SpotifyControlBody = z.infer<typeof SpotifyControlSchema>
