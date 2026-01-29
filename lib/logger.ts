// lib/logger.ts
import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import type { LoggerOptions } from 'pino'

// Common logger interface
export interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
  child: (bindings: object) => Logger
}

type HttpLogger = (
  req: Request,
  res: Response,
  next: (err?: Error) => void
) => void

const createLogger = (): { logger: Logger; httpLogger: HttpLogger } => {
  if (typeof window === 'undefined') {
    // Server-side logger using pino
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pino = require('pino')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pinoHttp = require('pino-http')

    const pinoOptions: LoggerOptions = {
      level:
        process.env.NODE_ENV === 'test'
          ? 'silent'
          : process.env.LOG_LEVEL ||
            (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers',
        ],
        remove: true,
      },
    }

    if (process.env.NODE_ENV === 'development') {
      pinoOptions.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname,req,res,responseTime',
        },
      }
    }

    const pinoLogger = pino(pinoOptions)

    const httpLogger: HttpLogger = pinoHttp({
      logger: pinoLogger,
      genReqId: function (req: Request, res: Response) {
        const existingID = req.id ?? req.headers['x-request-id']
        if (existingID) return existingID
        const id = randomUUID()
        res.setHeader('X-Request-Id', id)
        return id
      },
      customLogLevel: function (_req: Request, res: Response, err?: Error) {
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn'
        if (res.statusCode >= 500 || err) return 'error'
        if (res.statusCode >= 300 && res.statusCode < 400) {
          return process.env.NODE_ENV === 'production' ? 'silent' : 'info'
        }
        return 'info'
      },
      customProps: function (req: Request) {
        return {
          userId: req.user?.id ?? req.session?.user?.id,
        }
      },
      customSuccessMessage: function (req: Request, res: Response) {
        if (res.statusCode === 404) return `Resource not found`
        return `${req.method} ${req.url} completed`
      },
      customErrorMessage: function (req: Request, res: Response, _err: Error) {
        return `${req.method} ${req.url} errored with status code ${res.statusCode}`
      },
    })
    return { logger: pinoLogger as unknown as Logger, httpLogger }
  } else {
    // Client-side logger using console
    const logger: Logger = {
      debug: (msg: unknown, ...args: unknown[]) => console.log(msg, ...args),
      info: (msg: unknown, ...args: unknown[]) => console.info(msg, ...args),
      warn: (msg: unknown, ...args: unknown[]) => console.warn(msg, ...args),
      error: (msg: unknown, ...args: unknown[]) => console.error(msg, ...args),
      child: function () {
        return this
      },
    }

    // Client-side mock for httpLogger middleware
    const httpLogger: HttpLogger = (
      _req: Request,
      _res: Response,
      next: (err?: Error) => void
    ) => {
      if (next) {
        next()
      }
    }
    return { logger, httpLogger }
  }
}

const { logger, httpLogger } = createLogger()

export { httpLogger }
export default logger
