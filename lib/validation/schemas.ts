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
  volume: z.number().min(0).max(100).optional(),
  deviceId: z.string().optional(),
  playlistUri: z.string().optional(),
})

export const playlistSearchSchema = z.object({
  query: z.string().min(1).max(100),
})

export const spotifyDevicesSchema = z.object({
  deviceId: z.string().min(1),
})

export const spotifyAccessTokenSchema = z.object({
  code: z.string().min(1),
  code_verifier: z.string().min(1),
})

export const tokenDeliverySchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
})

export const clearTokenSchema = z.object({
  token: z.string().min(1),
})

export const debugSessionSchema = z.object({
  action: z.enum(['get', 'clear']),
})

export const debugSpotifyTokenSchema = z.object({
  action: z.enum(['get', 'clear']),
})
