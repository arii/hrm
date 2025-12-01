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

export const spotifySearchSchema = z
  .object({
    query: z
      .string()
      .min(1, {
        message: 'Search query cannot be empty',
      })
      .max(100, {
        message: 'Search query cannot exceed 100 characters',
      }),
    // The 'type' parameter is expected as a comma-separated string,
    // which we transform into an array of strings.
    type: z
      .string()
      .min(1, { message: 'Search type cannot be empty' })
      .transform((val) => val.split(',')),
  })
  // strict() ensures that no other query parameters are allowed
  .strict()

// This schema ensures no unexpected query params are passed to the devices endpoint
export const spotifyDevicesSchema = z.object({}).strict()
