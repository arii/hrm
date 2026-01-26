// tests/unit/utils/logger-redaction.test.ts
/**
 * @jest-environment node
 */
import { Writable } from 'stream'
import pino from 'pino'
import { pinoOptions } from '../../../utils/logger.server'

describe('Server Logger Redaction using pinoOptions', () => {
  let stream: Writable
  let output: string
  let logger: pino.Logger

  beforeEach(() => {
    output = ''
    stream = new Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString()
        callback()
      },
    })
    // The imported pinoOptions has level: 'silent' in the test env.
    // We override it here to ensure logs are written to our test stream.
    const testPinoOptions = { ...pinoOptions, level: 'info' }
    logger = pino(testPinoOptions, stream)
  })

  it('should redact sensitive information from logs using the application configuration', () => {
    const mockReq = {
      headers: {
        cookie: 'session-id=12345; theme=dark',
        authorization: 'Bearer secret-jwt-token',
        'x-custom-header': 'safe-value',
      },
    }

    // Log an object with sensitive properties
    logger.info({ req: mockReq })

    const logObject = JSON.parse(output)

    expect(logObject.req).toBeDefined()
    expect(logObject.req.headers).toBeDefined()
    // The 'remove: true' option should make these keys disappear
    expect(logObject.req.headers.cookie).toBeUndefined()
    expect(logObject.req.headers.authorization).toBeUndefined()
    // This header should remain untouched
    expect(logObject.req.headers['x-custom-header']).toBe('safe-value')
  })
})
