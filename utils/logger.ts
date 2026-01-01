// utils/logger.ts
import pino from 'pino'

// Define a consistent logger interface
interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
  child(bindings: Record<string, unknown>): Logger
}

const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger - wrap console methods to match pino interface
    const logger: Logger = {
      debug: (msg: unknown, ...args: unknown[]) => console.log(msg, ...args),
      info: (msg: unknown, ...args: unknown[]) => console.info(msg, ...args),
      warn: (msg: unknown, ...args: unknown[]) => console.warn(msg, ...args),
      error: (msg: unknown, ...args: unknown[]) => console.error(msg, ...args),
      child(bindings: Record<string, unknown>) {
        // Simple implementation to preserve context in console
        return {
          ...this,
          info: (msg: unknown, ...args: unknown[]) =>
            console.info(bindings, msg, ...args),
          warn: (msg: unknown, ...args: unknown[]) =>
            console.warn(bindings, msg, ...args),
          error: (msg: unknown, ...args: unknown[]) =>
            console.error(bindings, msg, ...args),
          debug: (msg: unknown, ...args: unknown[]) =>
            console.log(bindings, msg, ...args),
          child: (newBindings) => this.child({ ...bindings, ...newBindings }),
        }
      },
    }
    return logger
  }

  // Server-side logger - pino already matches the interface
  const serverLogger = pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  })

  // The `as unknown as Logger` assertion is used because pino's logger type
  // is complex and not directly compatible with our simplified Logger interface.
  // This is a pragmatic workaround to avoid having to replicate pino's extensive
  // type definitions in our interface.
  return serverLogger as unknown as Logger
}

const logger = createLogger()

export default logger
export const wsLogger = logger.child({ tag: 'websocket' })
