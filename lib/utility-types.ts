// File: lib/utility-types.ts

/**
 * A utility type to remove a property from all members of a union type.
 * This is useful for creating public event types from internal event types,
 * where some internal properties should not be exposed.
 *
 * Example:
 * type Event = { type: 'A', payload: string } | { type: 'B' };
 * type PublicEvent = DistributiveOmit<Event, 'payload'>;
 * // PublicEvent is now { type: 'A' } | { type: 'B' }
 */
export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never
