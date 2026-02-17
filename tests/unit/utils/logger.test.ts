/**
 * @jest-environment node
 */
import { jest } from '@jest/globals'

describe('Client Logger (logger.ts)', () => {
  let originalConsoleInfo: any

  beforeEach(() => {
    jest.resetModules()
    // @ts-expect-error - mock window object
    global.window = {}
    originalConsoleInfo = console.info
  })

  afterEach(() => {
    console.info = originalConsoleInfo
  })

  it('should use console methods on the client-side', async () => {
    const consoleInfoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => {})

    const { default: logger } = await import('@/utils/logger')

    logger.info('test message')
    expect(consoleInfoSpy).toHaveBeenCalledWith('test message')
    consoleInfoSpy.mockRestore()
  })

  it('should return a no-op httpLogger on the client-side', async () => {
    const { httpLogger } = await import('@/utils/logger')
    const next = jest.fn()
    // @ts-expect-error - mock req and res
    httpLogger({}, {}, next)
    expect(next).toHaveBeenCalled()
  })
})
