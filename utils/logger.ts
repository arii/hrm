// utils/logger.ts
import pino, { Logger } from 'pino'

// This is a workaround for a TypeScript issue where it can't reconcile
// the difference between the Pino logger and the simple console logger.
// By explicitly casting to the Pino Logger type, we tell TypeScript to
// trust that the client-side logger has the same interface, which for our
// purposes, it does.
const createLogger = (): Logger => {
  if (typeof window !== 'undefined') {
    // Client-side logger
    return {
      debug: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    } as unknown as Logger
  }

  // Server-side logger
  return pino({
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  })
}

const logger = createLogger()

export default logger
