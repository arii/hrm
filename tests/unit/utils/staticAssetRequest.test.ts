/**
 * @jest-environment node
 */
import { isStaticAssetRequest } from '@/utils/logger.server'

describe('isStaticAssetRequest', () => {
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
    undefined,
  ])('keeps request logging for %s', (url) => {
    expect(isStaticAssetRequest(url)).toBe(false)
  })
})
