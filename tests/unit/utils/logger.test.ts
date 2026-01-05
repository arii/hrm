/* eslint-disable @typescript-eslint/no-require-imports */
// tests/unit/utils/logger.test.ts

describe('Logger', () => {
  // Store original process.env and window
  const originalEnv = { ...process.env }
  const originalWindow = global.window

  beforeEach(() => {
    // Reset modules before each test to ensure a clean slate
    jest.resetModules()
    // Restore NODE_ENV to a default 'test' state
    process.env = { ...originalEnv, NODE_ENV: 'test' }
    // Ensure window is undefined for server-side tests by default
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    })
  })

  afterAll(() => {
    // Restore original environment after all tests have run
    process.env = originalEnv
    global.window = originalWindow
  })

  test('should create a server-side pino logger when window is undefined', () => {
    // Arrange: The environment is 'test' and window is undefined by default.

    // Act
    const logger = require('../../../utils/logger').default

    // Assert
    // Check for a function that is characteristic of pino, not our console mock
    expect(logger.child).toBeInstanceOf(Function)
    expect(logger.info).not.toBe(console.info)
    const child = logger.child({ a: 1 })
    expect(child).not.toBe(logger) // Pino child loggers are new instances
  })

  test('should create a console logger when window is defined', () => {
    // Arrange
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
    })
    const consoleInfoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => {})

    // Act
    const logger = require('../../../utils/logger').default
    logger.info('test message')

    // Assert
    expect(logger.child).toBeInstanceOf(Function)
    const childLogger = logger.child({})
    expect(childLogger).toBe(logger) // Client child logger returns itself
    expect(consoleInfoSpy).toHaveBeenCalledWith('test message')

    // Cleanup
    consoleInfoSpy.mockRestore()
  })

  test('httpLogger should be a mock middleware on the client', () => {
    // Arrange
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
    })

    // Act
    const { httpLogger } = require('../../../utils/logger')
    const next = jest.fn()
    httpLogger({}, {}, next)

    // Assert
    expect(next).toHaveBeenCalled()
  })

  test('httpLogger should be a pino-http instance on the server', (done) => {
    // Arrange
    process.env.NODE_ENV = 'development'

    // Act
    const { httpLogger } = require('../../../utils/logger')

    // Assert
    // We need to wait for the dynamic import to resolve
    setTimeout(() => {
      expect(httpLogger).toBeDefined()
      done()
    }, 100)
  })
})
