// tests/unit/utils/logger.test.ts
import pino from 'pino'

jest.mock('pino-http', () => {
  const pinoHttp = jest.fn(
    () =>
      ({
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
      } as any)
  )
  return pinoHttp
})

jest.mock('pino', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('logger', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules() // Most important - it clears the cache
    process.env = { ...OLD_ENV } // Make a copy
  })

  afterAll(() => {
    process.env = OLD_ENV // Restore old environment
  })

  describe('createLogger', () => {
    it('should configure pino with a silent logger in test environment', () => {
      process.env.NODE_ENV = 'test'
      require('@/utils/logger')
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'silent',
        })
      )
    })

    it('should configure pino with a debug logger in development environment', () => {
      process.env.NODE_ENV = 'development'
      require('@/utils/logger')
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          transport: expect.any(Object),
        })
      )
    })

    it('should configure pino with an info logger in production environment', () => {
      process.env.NODE_ENV = 'production'
      require('@/utils/logger')
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      )
    })
  })

  describe('httpLogger', () => {
    it('should be a mock function on the client', () => {
      // Simulate client-side environment
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      })
      const httpLogger = require('@/utils/logger').httpLogger
      const next = jest.fn()
      httpLogger(null, null, next)
      expect(next).toHaveBeenCalled()
    })

    it('should be a pino-http logger on the server', () => {
      const httpLogger = require('@/utils/logger').httpLogger
      expect(httpLogger).toBeInstanceOf(Object)
    })
  })
})
