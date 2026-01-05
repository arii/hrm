import WebSocket from 'ws'
import { startServer, ServerProcess } from './test-helpers'

jest.setTimeout(60000)

describe('Server Integration Test', () => {
  let server: ServerProcess
  const PORT = 3006
  const wsUrl = `ws://127.0.0.1:${PORT}/ws`

  beforeAll(async () => {
    server = await startServer(PORT)
  })

  afterAll(async () => {
    await server.kill()
  })

  it('should enforce WebSocket connection limit', (done) => {
    const sockets: WebSocket[] = []
    const connectionLimit = 2
    let errors = 0

    for (let i = 0; i < connectionLimit + 1; i++) {
      const ws = new WebSocket(wsUrl)
      sockets.push(ws)

      ws.on('open', () => {
        // Do nothing
      })

      ws.on('error', (err) => {
        errors++
        expect(err.message).toContain('429')
        if (errors === 1) {
          sockets.forEach((socket) => socket.close())
          done()
        }
      })
    }
  })

  it('should enforce rate limiting', async () => {
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        fetch(`http://127.0.0.1:${PORT}/api/health`).then((res) => res.status)
      )
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const results = await Promise.all(promises)
    const successfulRequests = results.filter((status) => status === 200).length
    const rateLimitedRequests = results.filter(
      (status) => status === 429
    ).length

    expect(successfulRequests).toBe(5)
    expect(rateLimitedRequests).toBe(5)
  }, 10000)
})
