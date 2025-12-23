// File: tests/playwright/auth-flow.spec.ts
import { test, expect } from '@playwright/test'
import { env } from '../../lib/env'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have Spotify credentials', () => {
    expect(env.SPOTIFY_CLIENT_ID).toBeDefined()
    expect(env.SPOTIFY_CLIENT_ID).not.toBe('')
  })

  test('should have a NextAuth secret', () => {
    expect(env.NEXTAUTH_SECRET).toBeDefined()
    expect(env.NEXTAUTH_SECRET).not.toBe('')
  })

  test('should have a Spotify client secret', () => {
    expect(env.SPOTIFY_CLIENT_SECRET).toBeDefined()
    expect(env.SPOTIFY_CLIENT_SECRET).not.toBe('')
  })
})
