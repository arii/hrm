/**
 * @file This file contains utility functions for handling dates and times.
 * @module lib/shared/utils/dateUtils
 */

/**
 * Converts a Date object or a Unix epoch timestamp (in milliseconds) to an ISO 8601 string.
 * This format is standardized and ideal for API communication and logging.
 *
 * @param {Date | number} date - The date object or Unix timestamp (in milliseconds) to convert.
 * @returns {string} The date formatted as an ISO 8601 string (e.g., "2023-10-27T10:00:00.000Z").
 * @example
 * // Returns "1995-12-17T03:24:00.000Z"
 * toISO8601(new Date('1995-12-17T03:24:00Z'));
 *
 * // Returns "2021-01-01T00:00:00.000Z"
 * toISO8601(1609459200000);
 */
export function toISO8601(date: Date | number): string {
  return new Date(date).toISOString()
}

/**
 * Converts an ISO 8601 string to a Unix epoch timestamp in milliseconds.
 * This is useful for converting standardized string representations of dates back into a numeric format for calculations.
 *
 * @param {string} isoString - The date in ISO 8601 format.
 * @returns {number} The Unix epoch timestamp in milliseconds.
 * @example
 * // Returns 819170640000
 * toUnixTimestamp("1995-12-17T03:24:00.000Z");
 */
export function toUnixTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

/**
 * Gets the current time as an ISO 8601 string.
 * A convenient shorthand for getting a standardized timestamp.
 *
 * @returns {string} The current time in ISO 8601 format.
 * @example
 * // Returns the current UTC time, e.g., "2023-11-20T15:30:00.000Z"
 * nowAsISO();
 */
export function nowAsISO(): string {
  return new Date().toISOString()
}

/**
 * Gets the current time as a Unix epoch timestamp in milliseconds.
 * Useful for performance monitoring or simple time comparisons.
 *
 * @returns {number} The current Unix epoch timestamp in milliseconds.
 * @example
 * // Returns the current timestamp, e.g., 1699980000000
 * nowAsUnix();
 */
export function nowAsUnix(): number {
  return Date.now()
}
