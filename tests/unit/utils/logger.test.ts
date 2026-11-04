/**
 * @jest-environment node
 */
import { jest } from '@jest/globals'

describe('Client Logger (logger.ts)', () => {
  beforeEach(() => {
    jest.resetModules()
    // @ts-expect-error - mock window object
    global.window = {}
  })

  afterEach(() => {
    jest.restoreAllMocks()
    // @ts-expect-error - restore window object if needed, but here we just reset modules.
    delete global.window
  })

  it('should use console methods on the client-side', async () => {
    const consoleInfoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => {})

    const { default: logger } = await import('@/utils/logger')

    logger.info('test message')
    expect(consoleInfoSpy).toHaveBeenCalledWith('test message')
  })

  it('should silence debug/info in production but keep warn/error', async () => {
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    jest.resetModules()
    try {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const { default: logger } = await import('@/utils/logger')

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(logSpy).not.toHaveBeenCalled()
      expect(infoSpy).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith('warn message')
      expect(errorSpy).toHaveBeenCalledWith('error message')
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })

  it('should return a no-op httpLogger on the client-side', async () => {
    const { httpLogger } = await import('@/utils/logger')
    const next = jest.fn()
    // @ts-expect-error - mock req and res
    httpLogger({}, {}, next)
    expect(next).toHaveBeenCalled()
  })
})
