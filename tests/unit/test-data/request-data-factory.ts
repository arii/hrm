import { IncomingMessage } from 'http'
import { TLSSocket } from 'tls'

/**
 * Creates a mock IncomingMessage object for use in tests.
 * @param url - The request URL.
 * @param headers - Request headers.
 * @param socket - A mock socket object.
 * @returns A mock IncomingMessage.
 */
export const createMockRequest = (
  url = '/?clientId=test-client',
  headers: Record<string, string> = {},
  socket: Record<string, unknown> = {}
): IncomingMessage => {
  const baseSocket = {
    remoteAddress: '127.0.0.1',
    ...socket,
  }
  // This is a more robust way to mock a TLSSocket for `instanceof` checks
  if (socket instanceof TLSSocket) {
    Object.setPrototypeOf(baseSocket, TLSSocket.prototype)
  }

  return {
    url,
    headers: {
      host: 'localhost:3000',
      'user-agent': 'jest-test',
      origin: 'http://localhost:3000',
      ...headers,
    },
    socket: baseSocket,
  } as unknown as IncomingMessage // Type assertion for test purposes
}
