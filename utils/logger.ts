// utils/logger.ts
import { randomUUID } from 'crypto'
import pino from 'pino'
import pinoHttp from 'pino-http'

// Define a consistent logger interface
interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
  child: (bindings: pino.Bindings) => Logger
}

const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger - wrap console methods to match pino interface
    return {
      debug: (msg: unknown, ...args: unknown[]) => console.log(msg, ...args),
      info: (msg: unknown, ...args: unknown[]) => console.info(msg, ...args),
      warn: (msg: unknown, ...args: unknown[]) => console.warn(msg, ...args),
      error: (msg: unknown, ...args: unknown[]) => console.error(msg, ...args),
      child: function () {
        return this
      }, // Return self for child logger on client
    }
  }

  // Server-side logger - pino already matches the interface
  const pinoOptions: pino.LoggerOptions = {
    // In test, we want a silent logger by default
    level:
      process.env.NODE_ENV === 'test'
        ? 'silent'
        : process.env.LOG_LEVEL ||
          (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  }

  // Use pino-pretty only in development for better readability
  if (process.env.NODE_ENV === 'development') {
    pinoOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        // HACK: On a TTY, pino-pretty seems to swallow the first log message.
        // Prepending a newline seems to fix this.
        // A potential cause is that the TTY is not yet ready when the first log message is written.
        messageFormat: (log: any, messageKey: any) => {
          if (log.req) {
            return `\n ${log[messageKey]}`
          }
          return ` ${log[messageKey]}`
        },
        ignore: 'pid,hostname,req,res,responseTime',
      },
    }
  }

  return pino(pinoOptions) as unknown as Logger // Casting to unknown first to avoid type errors
}

const logger = createLogger()

// Conditionally create httpLogger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let httpLogger: any

if (typeof window === 'undefined') {
  // We are on the server
  httpLogger = pinoHttp({
    logger: logger as pino.Logger, // Cast to pino.Logger for pinoHttp
    genReqId: function (req, res) {
      const existingID = req.id ?? req.headers['x-request-id']
      if (existingID) return existingID
      const id = randomUUID()
      res.setHeader('X-Request-Id', id)
      return id
    },

    customLogLevel: function (req, res, err) {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn'
      } else if (res.statusCode >= 500 || err) {
        return 'error'
      }
      // pino-http logs redirects as 'silent'
      // but we want to see them in development
      if (res.statusCode >= 300 && res.statusCode < 400) {
        return process.env.NODE_ENV === 'production' ? 'silent' : 'info'
      }
      return 'info'
    },
    // Add custom properties to the log
    customProps: function (req: any) {
      return {
        // Add user context if available
        userId: req.user?.id,
        sessionId: req.session?.id,
      }
    },
    // Modify the log message
    customSuccessMessage: function (req, res) {
      if (res.statusCode === 404) {
        return `Resource not found`
      }
      return `${req.method} ${req.url} completed`
    },
    customErrorMessage: function (req, res, err) {
      return `${req.method} ${req.url} errored with status code ${
        res.statusCode
      }`
    },
  })
} else {
  // We are on the client, provide a mock middleware
  httpLogger = (
    req: any,
    res: any,
    next: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => {
    if (next) {
      next()
    }
  }
}

export { httpLogger }
export default logger
