/**
 * @file This file contains utility functions for handling dates.
 * @module lib/shared/utils/date
 */

/**
 * Converts a Date object or a Unix epoch timestamp (in milliseconds) to an ISO 8601 string.
 *
 * @param {Date | number} date - The date to convert.
 * @returns {string} The date in ISO 8601 format (e.g., "2023-10-27T10:00:00.000Z").
 * @example
 * toISO8601(new Date()) // "2023-10-27T10:00:00.000Z"
 * toISO8601(1698397200000) // "2023-10-27T10:00:00.000Z"
 */
export function toISO8601(date: Date | number): string {
  return new Date(date).toISOString()
}

/**
 * Converts an ISO 8601 string to a Unix epoch timestamp in milliseconds.
 *
 * @param {string} isoString - The date in ISO 8601 format.
 * @returns {number} The Unix epoch timestamp in milliseconds.
 * @example
 * toUnixTimestamp("2023-10-27T10:00:00.000Z") // 1698397200000
 */
export function toUnixTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

/**
 * Gets the current time as an ISO 8601 string.
 *
 * @returns {string} The current time in ISO 8601 format.
 * @example
 * nowAsISO() // "2023-10-27T10:00:00.000Z"
 */
export function nowAsISO(): string {
  return new Date().toISOString()
}

/**
 * Gets the current time as a Unix epoch timestamp in milliseconds.
 *
 * @returns {number} The current Unix epoch timestamp in milliseconds.
 * @example
 * nowAsUnix() // 1698397200000
 */
export function nowAsUnix(): number {
  return Date.now()
}
