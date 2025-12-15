/**
 * @fileoverview E2E tests for API rate limiting.
 * @description These tests verify that the server correctly applies rate limits
 * to API endpoints, returning a 429 status code when the limit is exceeded.
 */

import { test, expect } from '@playwright/test'

// Note: These tests require `RATE_LIMITING_ENABLED=true` in the test environment.

test.describe('API Rate Limiting - Sensitive Endpoints', () => {
  test('should return a 429 for sensitive API limit exceeding', async ({
    request,
  }) => {
    test.setTimeout(60000)
    const endpoint = '/api/workout'
    const limit = 55 // Configured max is 50

    const responses = []
    for (let i = 0; i < limit; i++) {
      const response = await request.post(endpoint, { data: {} })
      responses.push(response)
    }

    const rateLimitedResponse = responses.find((res) => res.status() === 429)
    expect(rateLimitedResponse).toBeDefined()
    expect(rateLimitedResponse?.status()).toBe(429)
    const body = await rateLimitedResponse?.json()
    expect(body.error).toContain('Too many requests')
  })
})

test.describe('API Rate Limiting - Critical Endpoints', () => {
  test('should return 429 for critical API limit exceeding', async ({
    request,
  }) => {
    test.setTimeout(60000)
    const endpoint = '/api/internal/health/services' // An example of a critical endpoint
    const limit = 105 // Configured max is 100

    const responses = []
    for (let i = 0; i < limit; i++) {
      const response = await request.get(endpoint)
      responses.push(response)
    }

    const rateLimitedResponse = responses.find((res) => res.status() === 429)
    expect(rateLimitedResponse).toBeDefined()
    expect(rateLimitedResponse?.status()).toBe(429)
  })
})

test.describe('API Rate Limiting - Authentication Endpoints', () => {
  test('should return 429 for authentication API limit exceeding', async ({
    request,
  }) => {
    test.setTimeout(60000)
    // Use the session endpoint as it's a reliable auth-related route
    const endpoint = '/api/auth/session'
    const limit = 15 // Configured max is 10

    const responses = []
    for (let i = 0; i < limit; i++) {
      const response = await request.get(endpoint)
      responses.push(response)
    }

    const rateLimitedResponse = responses.find((res) => res.status() === 429)
    expect(rateLimitedResponse).toBeDefined()
    expect(rateLimitedResponse?.status()).toBe(429)
  })
})

test.describe('API Rate Limiting - General Endpoints', () => {
  test('should return 429 for general API limit exceeding', async ({
    request,
  }) => {
    test.setTimeout(60000)
    const endpoint = '/api/health' // A general, non-specific endpoint
    const limit = 205 // Configured max is 200

    const responses = []
    for (let i = 0; i < limit; i++) {
      const response = await request.get(endpoint)
      responses.push(response)
    }

    const rateLimitedResponse = responses.find((res) => res.status() === 429)
    expect(rateLimitedResponse).toBeDefined()
    expect(rateLimitedResponse?.status()).toBe(429)
  })
})
