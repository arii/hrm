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

  it('should redact Spotify tokens from log objects', () => {
    const spotifyApiResponse = {
      access_token: 'this-is-a-super-secret-access-token',
      refresh_token: 'this-is-an-even-more-secret-refresh-token',
      expires_in: 3600,
      scope: 'read-private',
    }

    const logPayload = {
      status: 200,
      body: spotifyApiResponse,
    }

    // Log an object with sensitive Spotify token properties
    logger.info(logPayload)

    const logObject = JSON.parse(output)

    expect(logObject.body).toBeDefined()
    // The 'remove: true' option should make these keys disappear
    expect(logObject.body.access_token).toBeUndefined()
    expect(logObject.body.refresh_token).toBeUndefined()
    // Other properties should remain
    expect(logObject.body.expires_in).toBe(3600)
    expect(logObject.body.scope).toBe('read-private')
  })
})
