// utils/logger.ts
import pino from 'pino'
import { env } from '../lib/env'

// Define a consistent logger interface
interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
}

const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger - wrap console methods to match pino interface
    return {
      debug: (msg: unknown, ...args: unknown[]) => console.log(msg, ...args),
      info: (msg: unknown, ...args: unknown[]) => console.info(msg, ...args),
      warn: (msg: unknown, ...args: unknown[]) => console.warn(msg, ...args),
      error: (msg: unknown, ...args: unknown[]) => console.error(msg, ...args),
    }
  }

  // Server-side logger - pino already matches the interface
  return pino({
    enabled: env.NODE_ENV !== 'test',
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  }) as Logger
}

const logger = createLogger()

export default logger
