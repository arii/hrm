import { z } from 'zod'

export const spotifyControlSchema = z
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
    if (data.command === 'SET_VOLUME' && data.volume === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Volume is required for SET_VOLUME command',
        path: ['volume'],
      })
    }
    if (data.command === 'TRANSFER_PLAYBACK' && !data.deviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Device ID is required for TRANSFER_PLAYBACK command',
        path: ['deviceId'],
      })
    }
  })
