
import { httpLogger, pinoOptions } from '../../utils/logger.server'
import { NextFunction, Request, Response } from 'express'
import pino from 'pino'
import { Writable } from 'stream'

type LogEntry = {
  msg: string
  [key: string]: unknown
}

// Create a custom stream to capture log output
const createCapturingStream = (logOutput: LogEntry[]) => {
  return new Writable({
    write(chunk, encoding, callback) {
      try {
        logOutput.push(JSON.parse(chunk.toString()))
      } catch (e) {
        // Ignore parse errors for non-JSON output (like pino-pretty)
      }
      callback()
    },
  })
}

describe('Logging System', () => {
  describe('Data Redaction', () => {
    it('should redact access_token and refresh_token in log objects', () => {
      const logOutput: LogEntry[] = []
      const stream = createCapturingStream(logOutput)
      const logger = pino({ ...pinoOptions, level: 'info' }, stream)

      const sensitiveData = {
        user: 'test',
        access_token: 'should_be_redacted_token',
        refresh_token: 'should_be_redacted_refresh_token',
        other_data: 'is_visible',
      }
      logger.info(sensitiveData, 'Sensitive data test')

      expect(logOutput.length).toBe(1)
      const logEntry = logOutput[0]

      expect(logEntry.access_token).toBe('[REDACTED]')
      expect(logEntry.refresh_token).toBe('[REDACTED]')
      expect(logEntry.user).toBe('test')
      expect(logEntry.other_data).toBe('is_visible')
      expect(logEntry.msg).toBe('Sensitive data test')
    })
  })

  describe('pinoHttp autoLogging ignore paths', () => {
    const mockRequest = (url: string) =>
      ({
        url,
        headers: {},
        method: 'GET',
        get: () => undefined,
      }) as unknown as Request

    const mockResponse = () => {
      const res = {
        statusCode: 200,
        end: jest.fn(),
        on: jest.fn(),
        getHeaders: jest.fn(() => ({})),
        getHeader: jest.fn(),
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        writableEnded: true,
      } as unknown as Response
      res[Symbol.iterator] = jest.fn()
      return res
    }
    const mockNext: NextFunction = () => {}

    it('should not log requests to ignored paths', () => {
      const logOutput: LogEntry[] = []
      const stream = createCapturingStream(logOutput)

      // Replace the logger's stream with our capturing stream
      // We can't easily replace the stream in the existing httpLogger,
      // so we create a new instance with the same options.
      const testHttpLogger = httpLogger

      // Hack to override the logger's stream for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(testHttpLogger as any).logger.stream = stream

      const ignoredPaths = [
        '/api/health',
        '/api/health/deep',
        '/api/auth/session',
        '/api/spotify/callback?code=something',
      ]
      const loggedPath = '/api/user/profile'

      ignoredPaths.forEach((path) =>
        testHttpLogger(mockRequest(path), mockResponse(), mockNext)
      )

      testHttpLogger(mockRequest(loggedPath), mockResponse(), mockNext)

      // Only the loggedPath should produce a log
      expect(logOutput.length).toBe(1)
      expect(logOutput[0].msg).toContain('request completed')
    })
  })
})
