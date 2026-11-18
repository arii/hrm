/**
 * @jest-environment node
 */
import { isStaticAssetRequest } from '@/utils/logger.server'

describe('isStaticAssetRequest', () => {
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH
  beforeAll(() => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
  })
  afterAll(() => {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  })

  it.each([
    '/_next/static/chunks/app_layout.js',
    '/hrm/_next/static/css/app.css',
    '/assets/beep-07.wav',
    '/hrm/fonts/inter.woff2',
    '/favicon.ico',
    '/favicon.ico?v=2',
  ])('skips request logging for %s', (url) => {
    expect(isStaticAssetRequest(url)).toBe(true)
  })

  it.each([
    '/',
    '/hrm/client/control',
    '/api/auth/session',
    '/api/workout',
    '/api/assets-report',
    '/api/auth/callback/github?next=/_next/',
    '/api/workout?x=/assets/a',
    '/api/hrm/fonts/x',
    '/api/fonts/x',
    '/hrm/api/assets/x',
    undefined,
  ])('keeps request logging for %s', (url) => {
    expect(isStaticAssetRequest(url)).toBe(false)
  })
})
