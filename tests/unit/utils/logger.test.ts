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

  it('should return a no-op httpLogger on the client-side', async () => {
    const { httpLogger } = await import('@/utils/logger')
    const next = jest.fn()
    // @ts-expect-error - mock req and res
    httpLogger({}, {}, next)
    expect(next).toHaveBeenCalled()
  })
})
