/**
 * @jest-environment node
 */
import { jest } from '@jest/globals'

// Define mock implementations outside of jest.mock to have a reference.
const pinoMock = jest.fn()
const pinoHttpMock = jest.fn()

// Simplified mock: tests only verify initialization and transport configuration,
// not the logger methods themselves.
const mockPinoLogger = {
  child: jest.fn().mockReturnThis(),
  level: 'info',
}
pinoMock.mockReturnValue(mockPinoLogger)

describe('Server Logger (logger.server.ts)', () => {
  let originalNodeEnv: string | undefined
  let originalWindow: any

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    originalWindow = global.window

    jest.clearAllMocks()
    jest.resetModules()

    // Mock pino and pino-http for server-side tests
    jest.doMock('pino', () => ({ __esModule: true, default: pinoMock }))
    jest.doMock('pino-http', () => ({
      __esModule: true,
      default: pinoHttpMock,
    }))

    // Ensure window is deleted for server tests to simulate non-browser environment
    // @ts-expect-error - allow window to be deleted
    delete global.window
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalWindow) {
      // @ts-expect-error - restore window object
      global.window = originalWindow
    }
  })

  it('should create logger with pino-pretty transport in development', async () => {
    process.env.NODE_ENV = 'development'
    await import('@/utils/logger.server')

    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({
          target: 'pino-pretty',
          options: expect.any(Object),
        }),
      })
    )
  })

  it('should create a standard logger in production', async () => {
    process.env.NODE_ENV = 'production'
    await import('@/utils/logger.server')

    const pinoOptions = pinoMock.mock.calls[0][0]
    expect(pinoOptions).not.toHaveProperty('transport')
  })

  it('should create a silent logger in test environment', async () => {
    process.env.NODE_ENV = 'test'
    await import('@/utils/logger.server')

    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'silent',
      })
    )
  })

  it('should configure and export httpLogger correctly', async () => {
    await import('@/utils/logger.server')

    expect(pinoHttpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: pinoMock.mock.results[0].value,
      })
    )
  })
})
