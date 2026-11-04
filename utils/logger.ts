// utils/logger.ts
// This file is for client-side logging.
// For server-side logging, see `utils/logger.server.ts`

// The consistent logger interface both the client shim (here) and the
// server pino logger (logger.server.ts) implement. Housed in this
// dependency-free module so the server can import the type without the
// client ever pulling in pino.
export interface Logger {
  debug: (msg: string | object, ...args: unknown[]) => void
  info: (msg: string | object, ...args: unknown[]) => void
  warn: (msg: string | object, ...args: unknown[]) => void
  error: (msg: string | object, ...args: unknown[]) => void
  child: (bindings: object) => Logger
}

// Client-side logger - wrap console methods to match pino interface.
// debug/info are silenced in production: the prod console shows warnings
// and errors only. The env is read per call (not at import) so tests can
// flip it; Next inlines NODE_ENV at build time, so this costs nothing.
const isProduction = (): boolean => process.env.NODE_ENV === 'production'

const logger: Logger = {
  debug: (msg: unknown, ...args: unknown[]) => {
    if (!isProduction()) console.log(msg, ...args)
  },
  info: (msg: unknown, ...args: unknown[]) => {
    if (!isProduction()) console.info(msg, ...args)
  },
  warn: (msg: unknown, ...args: unknown[]) => console.warn(msg, ...args),
  error: (msg: unknown, ...args: unknown[]) => console.error(msg, ...args),
  child: function () {
    return this
  }, // Return self for child logger on client
}

// We are on the client, provide a mock middleware
const httpLogger = (
  _req: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  _res: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  next: any // eslint-disable-line @typescript-eslint/no-explicit-any
  // Reason: This is a client-side mock for server-only middleware; strict typing is not critical for this stub.
) => {
  if (next) {
    next()
  }
}

export { httpLogger }
export default logger
