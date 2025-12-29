import { z } from 'zod'

export const SpotifyTokenDeliveryPayloadSchema = z.object({
  refresh_token: z.string(),
  access_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
})
