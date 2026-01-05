// tests/unit/utils/logger.server.test.ts
/**
 * @jest-environment node
 */
import type { PinoLogger } from '../../../utils/logger.server'

// Define mock implementations outside of jest.mock to have a reference.
const pinoMock = jest.fn<
  PinoLogger,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [any, any?]
>()
const pinoHttpMock = jest.fn()

// Provide a default mock return value for the pino instance to avoid undefined errors.
pinoMock.mockReturnValue({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  silent: jest.fn(),
  child: jest.fn(),
  level: 'info',
  isLevelEnabled: jest.fn(),
  levels: {
    labels: {
      10: 'trace',
      20: 'debug',
      30: 'info',
      40: 'warn',
      50: 'error',
      60: 'fatal',
    },
    values: { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 },
  },
  version: 'test',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any)

describe('Server Logger', () => {
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    jest.clearAllMocks()
    jest.resetModules() // Crucial for re-evaluating the module in each test.
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should create logger with pino-pretty transport in development', async () => {
    process.env.NODE_ENV = 'development'

    // Use jest.doMock to ensure mocks are applied for this specific dynamic import.
    jest.doMock('pino', () => ({ __esModule: true, default: pinoMock }))
    jest.doMock('pino-http', () => ({
      __esModule: true,
      default: pinoHttpMock,
    }))

    await import('../../../utils/logger.server')

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

    jest.doMock('pino', () => ({ __esModule: true, default: pinoMock }))
    jest.doMock('pino-http', () => ({
      __esModule: true,
      default: pinoHttpMock,
    }))

    await import('../../../utils/logger.server')

    const pinoOptions = pinoMock.mock.calls[0][0]
    expect(pinoOptions).not.toHaveProperty('transport')
  })

  it('should create a silent logger in test environment', async () => {
    process.env.NODE_ENV = 'test'

    jest.doMock('pino', () => ({ __esModule: true, default: pinoMock }))
    jest.doMock('pino-http', () => ({
      __esModule: true,
      default: pinoHttpMock,
    }))

    await import('../../../utils/logger.server')

    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'silent',
      })
    )
  })

  it('should configure and export httpLogger correctly', async () => {
    jest.doMock('pino', () => ({ __esModule: true, default: pinoMock }))
    jest.doMock('pino-http', () => ({
      __esModule: true,
      default: pinoHttpMock,
    }))

    await import('../../../utils/logger.server')

    expect(pinoHttpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: pinoMock.mock.results[0].value,
      })
    )
  })
})
