// tests/unit/utils/logger-redaction.test.ts
/**
 * @jest-environment node
 */
import { Writable } from 'stream'
import pino from 'pino'

describe('Pino Redaction', () => {
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
  })

  it('should redact sensitive paths from a log object', () => {
    // Create a logger instance with the redaction options directly in the test
    logger = pino(
      {
        redact: {
          paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'res.headers',
          ],
          remove: true,
        },
      },
      stream
    )

    const mockReq = {
      headers: {
        cookie: 'session-id=12345; theme=dark',
        authorization: 'Bearer secret-jwt-token',
        'x-custom-header': 'safe-value',
      },
    }

    // Log an object that contains the sensitive paths
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
