// utils/logger.ts
import pino, { type Logger as PinoLogger } from 'pino'

// Define a consistent logger interface
interface Logger {
  debug: (msg: string | object, ...args: any[]) => void
  info: (msg: string | object, ...args: any[]) => void
  warn: (msg: string | object, ...args: any[]) => void
  error: (msg: string | object, ...args: any[]) => void
}

const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger - wrap console methods to match pino interface
    return {
      debug: (msg: any, ...args: any[]) => console.log(msg, ...args),
      info: (msg: any, ...args: any[]) => console.info(msg, ...args),
      warn: (msg: any, ...args: any[]) => console.warn(msg, ...args),
      error: (msg: any, ...args: any[]) => console.error(msg, ...args),
    }
  }

  // Server-side logger - pino already matches the interface
  return pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }) as Logger
}

const logger = createLogger()

export default logger
