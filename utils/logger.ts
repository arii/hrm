// utils/logger.ts
import pino from 'pino'

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
    return {}
  }

  // Server-side logger - pino already matches the interface
  return pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }) as Logger
}

const logger = createLogger()

export default logger
