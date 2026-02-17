/**
 * @jest-environment node
 */
import { jest } from '@jest/globals'

// Define mock implementations outside of jest.mock to have a reference.
const pinoMock = jest.fn()
const pinoHttpMock = jest.fn()

// Provide a default mock return value for the pino instance to avoid undefined errors.
const mockPinoLogger = Object.assign(jest.fn(), {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  silent: jest.fn(),
  child: jest.fn().mockReturnThis(),
  level: 'info',
  isLevelEnabled: jest.fn(),
  version: 'test',
})
pinoMock.mockReturnValue(mockPinoLogger)

describe('Server Logger (logger.server.ts)', () => {
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    jest.clearAllMocks()
    jest.resetModules()
    // Mock pino and pino-http for server-side tests
    jest.doMock('pino', () => ({ __esModule: true, default: pinoMock }))
    jest.doMock('pino-http', () => ({
      __esModule: true,
      default: pinoHttpMock,
    }))

    // Ensure window is deleted for server tests
    // @ts-expect-error - allow window to be deleted
    delete global.window
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
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
