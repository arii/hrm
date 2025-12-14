// utils/logger.ts
import pino from 'pino'

// Define a consistent logger interface that enforces a structured logging pattern.
// The desired call signature is `logger.info(message, contextObject)`.
interface Logger {
  debug: (msg: string, context?: Record<string, unknown>) => void
  info: (msg: string, context?: Record<string, unknown>) => void
  warn: (msg: string, context?: Record<string, unknown>) => void
  error: (msg: string, context?: Record<string, unknown>) => void
}

const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger: A simple wrapper around `console` that supports the structured pattern.
    // The browser's console handles object rendering nicely. We add a level prefix for clarity.
    return {
      debug: (msg: string, context?: Record<string, unknown>) => {
        if (context) {
          console.debug(`[DEBUG] ${msg}`, context)
        } else {
          console.debug(`[DEBUG] ${msg}`)
        }
      },
      info: (msg: string, context?: Record<string, unknown>) => {
        if (context) {
          console.info(`[INFO] ${msg}`, context)
        } else {
          console.info(`[INFO] ${msg}`)
        }
      },
      warn: (msg: string, context?: Record<string, unknown>) => {
        if (context) {
          console.warn(`[WARN] ${msg}`, context)
        } else {
          console.warn(`[WARN] ${msg}`)
        }
      },
      error: (msg: string, context?: Record<string, unknown>) => {
        if (context) {
          console.error(`[ERROR] ${msg}`, context)
        } else {
          console.error(`[ERROR] ${msg}`)
        }
      },
    }
  }

  // Server-side logger: A wrapper around Pino to adapt our desired `(msg, context)`
  // signature to Pino's preferred `(context, msg)` signature for structured logs.
  const pinoLogger = pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  })

  return {
    debug: (msg: string, context?: Record<string, unknown>) => {
      if (context) {
        pinoLogger.debug(context, msg)
      } else {
        pinoLogger.debug(msg)
      }
    },
    info: (msg: string, context?: Record<string, unknown>) => {
      if (context) {
        pinoLogger.info(context, msg)
      } else {
        pinoLogger.info(msg)
      }
    },
    warn: (msg: string, context?: Record<string, unknown>) => {
      if (context) {
        pinoLogger.warn(context, msg)
      } else {
        pinoLogger.warn(msg)
      }
    },
    error: (msg: string, context?: Record<string, unknown>) => {
      if (context) {
        pinoLogger.error(context, msg)
      } else {
        pinoLogger.error(msg)
      }
    },
  }
}

const logger = createLogger()

export default logger
