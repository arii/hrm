// utils/brandedId.ts
import crypto from 'crypto'
import { ClientId, ClientIdSchema } from '../types/branded'

/**
 * Generates a new, random ClientId.
 * This is used when a client connects without providing an existing ID.
 * @returns A freshly generated ClientId.
 */
export const generateClientId = (): ClientId => {
  return ClientIdSchema.parse(`user-${crypto.randomUUID()}`)
}

/**
 * Safely casts a plain string to the ClientId branded type using Zod validation.
 * This ensures that any string passed from an external source (e.g., URL param)
 * conforms to the expected format before being used in the application.
 *
 * @param id The string to cast.
 * @returns The validated string as a ClientId.
 * @throws {z.ZodError} if the id is not a non-empty string.
 */
export const toClientId = (id: string): ClientId => {
  return ClientIdSchema.parse(id)
}
