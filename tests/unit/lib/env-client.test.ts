/**
 * @jest-environment node
 */
describe('clientEnv', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('defaults NODE_ENV to development when unset', async () => {
    delete process.env.NODE_ENV
    const { clientEnv } = await import('@/lib/env-client')
    expect(clientEnv.NODE_ENV).toBe('development')
    expect(clientEnv.NEXT_PUBLIC_TESTING).toBeUndefined()
  })

  it('passes through NODE_ENV and NEXT_PUBLIC_TESTING', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_TESTING = 'true'
    const { clientEnv } = await import('@/lib/env-client')
    expect(clientEnv.NODE_ENV).toBe('production')
    expect(clientEnv.NEXT_PUBLIC_TESTING).toBe('true')
  })

  it('rejects garbage NODE_ENV', async () => {
    process.env.NODE_ENV = 'staging'
    await expect(import('@/lib/env-client')).rejects.toThrow()
  })
})
