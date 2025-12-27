// lib/validation/ws-schemas.ts
import { z } from '../zod'

export const HrmInputSchema = z.object({
  value: z.number().int().min(0, 'Heart rate value must be a positive integer.'),
})

export const HrmMetadataUpdateSchema = z.object({
  deviceId: z.string().optional(),
  age: z.number().int().min(0, 'Age must be a positive integer.').optional(),
  maxHr: z
    .number()
    .int()
    .min(0, 'Max heart rate must be a positive integer.')
    .optional(),
})

export type HrmMetadataUpdate = z.infer<typeof HrmMetadataUpdateSchema>

export const WebSocketMessageSchema = z.object({
  type: z.enum(['HRM_INPUT', 'HRM_METADATA_UPDATE']),
  data: z.any(),
})
