/**
 * @file Unit tests for the JSON utility functions in `utils/core/json.ts`.
 * @jest-environment node
 */
import { safeParseJSON } from '../../../utils/json.js'

describe('utils/core/json.ts', () => {
  describe('safeParseJSON', () => {
    it('should parse a valid JSON string', () => {
      const jsonString = '{"key": "value"}'
      expect(safeParseJSON(jsonString)).toEqual({ key: 'value' })
    })

    it('should return the original string for invalid JSON', () => {
      const invalidJsonString = 'not a json string'
      expect(safeParseJSON(invalidJsonString)).toBe(invalidJsonString)
    })

    it('should handle empty strings', () => {
      expect(safeParseJSON('')).toBe('')
    })

    it('should handle JSON primitives', () => {
      expect(safeParseJSON('123')).toBe(123)
      expect(safeParseJSON('true')).toBe(true)
      expect(safeParseJSON('null')).toBe(null)
    })
  })
})
