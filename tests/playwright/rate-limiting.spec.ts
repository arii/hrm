/**
 * @fileoverview E2E tests for API rate limiting.
 * @description These tests verify that the server correctly applies rate limits
 * to API endpoints, returning a 429 status code when the limit is exceeded.
 */

import { test, expect } from '@playwright/test'

// The endpoint to test. /api/workout is a good candidate as it's a sensitive endpoint.
const endpoint = '/api/workout'
// The number of requests to send. This should be greater than the max limit for the endpoint.
// From our config, the sensitive limit is 50 requests per minute.
const requestCount = 55

test.describe('API Rate Limiting', () => {
  test('should return a 429 status code when the rate limit is exceeded', async ({
    request,
  }) => {
    // We need to disable the default timeout for this test, as it will take a while
    // to send all the requests.
    test.setTimeout(120000) // 2 minutes

    const responses = []
    for (let i = 0; i < requestCount; i++) {
      // Send a POST request to the endpoint.
      // The body can be empty as we're only interested in the response status.
      const response = await request.post(endpoint, { data: {} })
      responses.push(response)
    }

    // Find the first response with a 429 status code.
    const rateLimitedResponse = responses.find(
      (response) => response.status() === 429
    )

    // Assert that a 429 response was received.
    expect(rateLimitedResponse).toBeDefined()
    expect(rateLimitedResponse?.status()).toBe(429)

    // Assert that the response body contains the expected error message.
    const responseBody = await rateLimitedResponse?.json()
    expect(responseBody).toHaveProperty(
      'error',
      'Too many requests, please try again later.'
    )
  })
})
