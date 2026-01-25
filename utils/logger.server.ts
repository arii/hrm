// utils/logger.server.ts
import pino from 'pino'
import { Request, Response } from 'express'
import pinoHttp from 'pino-http'
import { randomUUID } from 'crypto'

// Define a consistent logger interface
interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
  child: (bindings: pino.Bindings) => Logger
}

export const pinoOptions: pino.LoggerOptions = {
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
      // Redact Spotify tokens in log bodies
      'body.access_token',
      'body.refresh_token',
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

const logger = pino(pinoOptions) as Logger

const httpLogger = pinoHttp({
  logger: logger as pino.Logger,
  autoLogging: {
    ignore: (req) => {
      const pathsToIgnore = ['/api/auth', '/api/health']
      return pathsToIgnore.includes(req.url ?? '')
    },
  },
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

export { httpLogger }
export default logger
