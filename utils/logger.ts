// utils/logger.ts
import pino from 'pino'

// Define a consistent logger interface
interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
  child(bindings: Record<string, any>): Logger
}

const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger - wrap console methods to match pino interface
    const logger: Logger = {
      debug: (msg: unknown, ...args: unknown[]) => console.log(msg, ...args),
      info: (msg: unknown, ...args: unknown[]) => console.info(msg, ...args),
      warn: (msg: unknown, ...args: unknown[]) => console.warn(msg, ...args),
      error: (msg: unknown, ...args: unknown[]) => console.error(msg, ...args),
      child() {
        return this
      },
    }
    return logger
  }

  // Server-side logger - pino already matches the interface
  const serverLogger = pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  })

  return serverLogger as unknown as Logger
}

const logger = createLogger()

export default logger
export const wsLogger = logger.child({ tag: 'websocket' })
