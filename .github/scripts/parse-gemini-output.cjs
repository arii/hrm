/**
 * Robustly parses JSON output from an LLM.
 * Handles markdown code blocks, pre/postamble, and truncated JSON.
 *
 * @param {string} rawData - The raw output string from the LLM.
 * @returns {any} The parsed JSON object.
 * @throws {Error} If parsing fails completely.
 */
module.exports = function parseGeminiOutput(rawData) {
  if (!rawData) {
    throw new Error('No data provided to parse.');
  }

  // 1. Try direct parsing first
  try {
    return JSON.parse(rawData);
  } catch (e) {
    // Continue to fallback methods
  }

  // 2. Try to extract from markdown code blocks (```json ... ``` or just ``` ... ```)
  const codeBlockMatch = rawData.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Continue
    }
  }

  // 3. Try to extract a JSON object structure using regex
  const jsonObjectMatch = rawData.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch (e) {
       // Continue
    }
  }

  // 4. Last resort: Specific fallback for "description" field (common in PR enrichment)
  // This handles cases where the JSON might be malformed but the description string is extractable.
  if (rawData.includes('"description"')) {
    const descMatch = rawData.match(/"description"\s*:\s*"([\s\S]*?)(?<!\\)"/);
    if (descMatch) {
      try {
        // Manually reconstruct the object
        return { description: descMatch[1].replace(/\\n/g, '\n').replace(/\\\//g, '/') };
      } catch (e) {
        // Ignore
      }
    }
  }

  throw new Error('Failed to parse JSON from output.');
};
