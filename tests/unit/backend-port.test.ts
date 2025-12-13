// tests/unit/backend-port.test.ts
import http from 'http'
import { exec, ChildProcess } from 'child_process'
import kill from 'tree-kill'

describe('Backend Port Configuration', () => {
  let serverProcess: ChildProcess | null = null

  afterEach((done) => {
    if (serverProcess && serverProcess.pid) {
      kill(serverProcess.pid, 'SIGKILL', (_err) => {
        serverProcess = null
        done()
      })
    } else {
      done()
    }
  })

  it('should start the backend server on a custom port', (done) => {
    const port = 3002
    serverProcess = exec(`PORT=${port} node dist/server.mjs`)

    const checkServer = () => {
      http
        .get(`http://127.0.0.1:${port}/api/health`, (res) => {
          if (res.statusCode === 200) {
            expect(res.statusCode).toBe(200)
            done()
          } else {
            setTimeout(checkServer, 1000)
          }
        })
        .on('error', () => {
          setTimeout(checkServer, 1000)
        })
    }

    checkServer()
  }, 15000)
})
