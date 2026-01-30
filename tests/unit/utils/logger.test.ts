// tests/unit/utils/logger.test.ts
/* eslint-disable @typescript-eslint/no-require-imports */

// Mock pino and pino-http before imports
jest.mock('pino', () => {
  const pinoInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }
  const pinoFn = jest.fn(() => pinoInstance)
  return pinoFn
})

jest.mock('pino-http', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jest.fn(() => (_req: any, _res: any, next: any) => {
    if (next) {
      next()
    }
  })
})

describe('Logger', () => {
  const OLD_ENV = process.env

  afterEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    // @ts-expect-error - allow window to be deleted
    delete global.window
  })

  describe('Server-side Environment (logger.server.ts)', () => {
    it('should use pino with pretty-print in development', () => {
      process.env.NODE_ENV = 'development'
      const pino = require('pino')
      const { default: logger } = require('@/utils/logger.server')

      expect(typeof logger.info).toBe('function')
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: {
            target: 'pino-pretty',
            options: expect.any(Object),
          },
        })
      )
    })

    it('should use pino without pretty-print in production', () => {
      process.env.NODE_ENV = 'production'
      const pino = require('pino')
      require('@/utils/logger.server')

      expect(pino).toHaveBeenCalledWith(
        expect.not.objectContaining({
          transport: expect.any(Object),
        })
      )
    })
  })

  describe('Client-side Environment (logger.ts)', () => {
    beforeEach(() => {
      // @ts-expect-error - mock window object
      global.window = {}
    })

    it('should use console methods on the client-side', () => {
      const consoleInfoSpy = jest
        .spyOn(console, 'info')
        .mockImplementation(() => {})
      const { default: logger } = require('@/utils/logger')

      logger.info('test message')
      expect(consoleInfoSpy).toHaveBeenCalledWith('test message')
      consoleInfoSpy.mockRestore()
    })

    it('should return a no-op httpLogger on the client-side', () => {
      const { httpLogger } = require('@/utils/logger')
      const next = jest.fn()
      // @ts-expect-error - mock req and res
      httpLogger({}, {}, next)
      expect(next).toHaveBeenCalled()
    })
  })
})
