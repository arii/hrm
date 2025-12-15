// File: tests/playwright/rate-limiting.spec.ts
/**
 * Description: Integration tests for API rate limiting.
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

test.describe('API Rate Limiting', () => {
  test('should rate limit requests to the general API', () => {
    test.setTimeout(30000) // Keep the increased timeout

    // Execute the standalone test script
    try {
      const output = execSync('node scripts/rate-limit-test-runner.js', {
        encoding: 'utf-8',
      })
      console.log(output)
      // The script will exit with a non-zero code on failure
      expect(true).toBe(true)
    } catch (error) {
      console.error(error.stdout)
      console.error(error.stderr)
      // Fail the test if the script exits with an error
      test.fail(true, 'Rate limit script failed')
    }
  })
})
