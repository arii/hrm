/**
 * @jest-environment node
 */

describe('lib/env.ts', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should successfully validate and parse environment variables when all are present', async () => {
    process.env.NODE_ENV = 'production'
    process.env.PORT = '8080'
    process.env.HOST = '127.0.0.1'
    process.env.NEXTAUTH_URL = 'http://localhost:8080'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.SPOTIFY_CLIENT_ID = 'spotify-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'spotify-secret'
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8080'

    const { env } = await import('../../../lib/env')

    expect(env.NODE_ENV).toBe('production')
    expect(env.PORT).toBe(8080)
    expect(env.HOST).toBe('127.0.0.1')
    expect(env.NEXTAUTH_URL).toBe('http://localhost:8080')
    expect(env.NEXTAUTH_SECRET).toBe('secret')
    expect(env.SPOTIFY_CLIENT_ID).toBe('spotify-id')
    expect(env.SPOTIFY_CLIENT_SECRET).toBe('spotify-secret')
    expect(env.NEXT_PUBLIC_WS_URL).toBe('ws://localhost:8080')
  })

  it('should exit the process if a required variable is missing in production', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() was called.')
    })
    const mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    delete process.env.SPOTIFY_CLIENT_ID

    try {
      await import('../../../lib/env')
    } catch (e) {
      expect((e as Error).message).toBe('process.exit() was called.')
    }

    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockConsoleError).toHaveBeenCalled()

    mockExit.mockRestore()
    mockConsoleError.mockRestore()
  })

  it('should allow optional SPOTIFY variables when TESTING is true', async () => {
    process.env.TESTING = 'true'
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET

    const { env } = await import('../../../lib/env')

    expect(env.SPOTIFY_CLIENT_ID).toBeUndefined()
    expect(env.SPOTIFY_CLIENT_SECRET).toBeUndefined()
  })

  it('should fail if PORT is not a valid number', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() was called.')
    })
    const mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    process.env.PORT = 'not-a-number'

    try {
      await import('../../../lib/env')
    } catch (e) {
      expect((e as Error).message).toBe('process.exit() was called.')
    }

    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockConsoleError).toHaveBeenCalled()

    mockExit.mockRestore()
    mockConsoleError.mockRestore()
  })
})
