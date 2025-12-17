/**
 * @file This file contains utility functions for handling JSON data.
 */

/**
 * Safely parses a JSON string without throwing an error. If parsing fails,
 * it returns the original input string.
 * @param {string} input - The string to parse as JSON.
 * @returns {unknown} The parsed JSON object or the original string if parsing fails.
 */
export function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}
