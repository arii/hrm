// tests/unit/utils/logger.test.ts
/**
 * @jest-environment jsdom
 */

import type { Logger } from 'pino'
import type { NextFunction, Request, Response } from 'express'

describe('Client Logger', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: Logger<any>
  let httpLogger: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>

  beforeAll(async () => {
    // Dynamically import the logger module to test client-side execution
    const loggerModule = await import('../../../utils/logger')
    logger = loggerModule.default
    httpLogger = loggerModule.httpLogger
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should use console.info for the info method', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('test message')
    expect(infoSpy).toHaveBeenCalledWith('test message')
  })

  it('should use console.warn for the warn method', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('test warning')
    expect(warnSpy).toHaveBeenCalledWith('test warning')
  })

  it('should use console.error for the error method', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('test error')
    expect(errorSpy).toHaveBeenCalledWith('test error')
  })

  it('should return a mock httpLogger that calls next()', () => {
    const next = jest.fn()
    // The httpLogger on the client is a no-op middleware
    httpLogger({} as Request, {} as Response, next)
    expect(next).toHaveBeenCalled()
  })
})
