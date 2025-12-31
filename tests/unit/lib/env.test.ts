/**
 * @jest-environment node
 */

describe('env', () => {
  const OLD_ENV = process.env
  let consoleErrorSpy: jest.SpyInstance
  let processExitSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`)
    })
  })

  afterEach(() => {
    process.env = OLD_ENV
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  it('should not throw an error if the environment variables are valid', async () => {
    process.env.NODE_ENV = 'development'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NEXTAUTH_SECRET = 'secret'
    process.env.SPOTIFY_CLIENT_ID = 'client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'client-secret'
    process.env.ENCRYPTION_KEY = 'encryption-key'
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001'
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'

    await expect(import('../../../lib/env')).resolves.toBeDefined()
  })

  it('should call process.exit(1) if the environment variables are invalid in development', async () => {
    process.env.NODE_ENV = 'development'
    process.env.NEXTAUTH_URL = 'not-a-url'
    // other required vars are missing

    await expect(import('../../../lib/env')).rejects.toThrow(
      'process.exit called with code 1'
    )
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should not throw an error in a test environment, even if env vars are missing', async () => {
    process.env.NODE_ENV = 'test'
    // Intentionally omit required environment variables
    delete process.env.NEXTAUTH_SECRET
    delete process.env.SPOTIFY_CLIENT_ID

    await expect(import('../../../lib/env')).resolves.toBeDefined()
  })
})
