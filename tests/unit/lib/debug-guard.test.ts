import { debugAccessDenied } from '@/lib/debug-guard'
import { isDebugBlocked } from '@/lib/debug-gate'
import { env } from '@/lib/env'

jest.mock('@/lib/env', () => ({
  env: {},
}))

const mockEnv = env as unknown as Record<string, string | undefined>

describe('debugAccessDenied', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  })

  it('denies production without the TESTING bypass', async () => {
    mockEnv.NODE_ENV = 'production'
    const res = debugAccessDenied()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
    await expect(res!.json()).resolves.toEqual({
      error: 'Not available in production',
    })
  })

  it('allows production with TESTING=true (VRT runs prod builds)', () => {
    mockEnv.NODE_ENV = 'production'
    mockEnv.TESTING = 'true'
    expect(debugAccessDenied()).toBeNull()
  })

  it('allows non-production without any bypass', () => {
    mockEnv.NODE_ENV = 'development'
    expect(debugAccessDenied()).toBeNull()
  })
})

describe('isDebugBlocked', () => {
  it.each([
    ['production', undefined, true],
    ['production', 'false', true],
    ['production', 'true', false],
    ['development', undefined, false],
    ['test', 'false', false],
  ])('NODE_ENV=%s TESTING=%s -> blocked=%s', (nodeEnv, testing, expected) => {
    expect(isDebugBlocked(nodeEnv, testing)).toBe(expected)
  })
})
