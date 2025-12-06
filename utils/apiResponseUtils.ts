// utils/apiResponseUtils.ts

/**
 * Safely parses a JSON string, falling back to the original text if parsing fails.
 * @param input The JSON string to parse.
 * @returns The parsed JSON object or the original string.
 */
export function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}
