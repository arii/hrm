/**
 * @jest-environment node
 */
// Set a dummy API key before any imports to prevent the script from calling
// process.exit(1) when the module is imported, which was crashing the Jest worker.
process.env.GEMINI_API_KEY = 'test-key'

import { getReviewContextFromEnv } from '../../scripts/gemini-client'

describe('gemini-client', () => {
  describe('getReviewContextFromEnv', () => {
    afterEach(() => {
      // Clean up environment variables after each test
      delete process.env.FAILED_CHECKS_JSON
    })

    it('should parse FAILED_CHECKS_JSON correctly when it is a valid JSON string', () => {
      const mockFailedChecks = [
        {
          name: 'lint',
          conclusion: 'failure',
          detailsUrl: 'http://example.com/lint',
        },
        {
          name: 'build',
          conclusion: 'cancelled',
          detailsUrl: 'http://example.com/build',
        },
      ]
      process.env.FAILED_CHECKS_JSON = JSON.stringify(mockFailedChecks)

      const context = getReviewContextFromEnv()

      expect(context.failedChecks).toEqual(mockFailedChecks)
    })

    it('should return an empty array for failedChecks when FAILED_CHECKS_JSON is not set', () => {
      const context = getReviewContextFromEnv()
      expect(context.failedChecks).toEqual([])
    })

    it('should return an empty array for failedChecks when FAILED_CHECKS_JSON is an empty string', () => {
      process.env.FAILED_CHECKS_JSON = ''
      const context = getReviewContextFromEnv()
      expect(context.failedChecks).toEqual([])
    })

    it('should return an empty array for failedChecks when FAILED_CHECKS_JSON is an empty JSON array', () => {
      process.env.FAILED_CHECKS_JSON = '[]'
      const context = getReviewContextFromEnv()
      expect(context.failedChecks).toEqual([])
    })

    it('should return an empty array if FAILED_CHECKS_JSON is invalid JSON', () => {
      process.env.FAILED_CHECKS_JSON = 'invalid-json'
      const context = getReviewContextFromEnv()
      expect(context.failedChecks).toEqual([])
    })
  })
})
