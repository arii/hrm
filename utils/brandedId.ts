// utils/brandedId.ts
import { ClientId } from '../types/branded'

/**
 * Generates a new, random ClientId.
 * This is used when a client connects without providing an existing ID.
 * @returns A freshly generated ClientId.
 */
export const generateClientId = (): ClientId => {
  return `user-${Math.random().toString(36).substring(2, 9)}` as ClientId
}

/**
 * Casts a plain string to the ClientId branded type.
 * This is used to safely convert an ID received from an external source (e.g., URL param)
 * into the application's type-safe domain.
 *
 * It's important to note that this is a type assertion, which is a way to tell
 * the TypeScript compiler to trust us that the provided string is, in fact, a
 * ClientId. This is a safe and necessary practice at the boundaries of the
 * application, where we receive data from external sources that are not yet
 * part of our type-safe domain.
 *
 * @param id The string to cast.
 * @returns The string as a ClientId.
 */
export const toClientId = (id: string): ClientId => {
  return id as ClientId
}
