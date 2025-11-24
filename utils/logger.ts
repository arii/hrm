// utils/logger.ts
import pino from 'pino'

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
}

const logger = createLogger()

export default logger
