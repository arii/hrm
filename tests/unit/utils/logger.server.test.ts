// tests/unit/utils/logger.server.test.ts
describe('Server Logger Configuration', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it("should set log level to 'silent' when NODE_ENV is 'test'", async () => {
    process.env.NODE_ENV = 'test'
    const { pinoOptions: options } = await import('@/utils/logger.server')
    expect(options.level).toBe('silent')
  })

  it("should set log level to 'info' when NODE_ENV is 'production'", async () => {
    process.env.NODE_ENV = 'production'
    const { pinoOptions: options } = await import('@/utils/logger.server')
    expect(options.level).toBe('info')
  })

  it("should set log level to 'debug' when NODE_ENV is 'development'", async () => {
    process.env.NODE_ENV = 'development'
    const { pinoOptions: options } = await import('@/utils/logger.server')
    expect(options.level).toBe('debug')
  })

  it('should override the log level with LOG_LEVEL environment variable', async () => {
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'warn'
    const { pinoOptions: options } = await import('@/utils/logger.server')
    expect(options.level).toBe('warn')
  })
})
