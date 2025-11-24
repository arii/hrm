// utils/logger.ts
import pino from 'pino'

<<<<<<< HEAD
const createLogger = () => {
  if (typeof window !== 'undefined') {
    // Client-side logger
    return {
      debug: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }
  }

  // Server-side logger
  return pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  })
=======
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
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }) as Logger
>>>>>>> origin/leader
}

const logger = createLogger()

export default logger
