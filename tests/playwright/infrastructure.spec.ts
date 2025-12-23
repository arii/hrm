// File: tests/playwright/infrastructure.spec.ts
import { test, expect } from '@playwright/test'
import { env } from '../../lib/env'

test.describe('Infrastructure', () => {
  test('should return a 200 OK for the health check', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })

  test('should have a valid NEXTAUTH_URL', () => {
    expect(env.NEXTAUTH_URL).toBeDefined()
    expect(env.NEXTAUTH_URL).not.toBe('')
  })
})
