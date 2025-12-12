import { test, expect } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import net from 'net'
import http from 'http'
import { WAIT_TIMEOUTS } from './lib/waits'
import WebSocket from 'ws'

const PORT = 3007
let serverProcess: ChildProcess

const waitForPort = (port: number, timeout = WAIT_TIMEOUTS.INFRASTRUCTURE) => {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now()
    const interval = setInterval(() => {
      const socket = new net.Socket()
      socket.connect(port, '127.0.0.1', () => {
        socket.destroy()
        clearInterval(interval)
        resolve()
      })
      socket.on('error', (err) => {
        socket.destroy()
        if (Date.now() - start > timeout) {
          clearInterval(interval)
          reject(new Error(`Timeout waiting for port ${port}: ${err.message}`))
        }
      })
    }, 500)
  })
}

test.beforeAll(async () => {
  console.log('Starting server for port tests...')
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    NEXTAUTH_SECRET: 'test-secret-for-ports-spec',
    NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
  }

  serverProcess = spawn('./start-production.sh', [], {
    detached: true,
    stdio: ['ignore', 'inherit', 'inherit'],
    env,
  })

  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err)
    process.exit(1)
  })

  await waitForPort(PORT)
  console.log('Server started for port tests.')
})

test.afterAll(async () => {
  console.log('Stopping server for port tests...')
  if (serverProcess && serverProcess.pid) {
    try {
      process.kill(-serverProcess.pid)
    } catch (e) {
      console.error('Failed to kill server process for port tests:', e)
    }
  }
  console.log('Server stopped for port tests.')
})

test.describe('Port Health Checks', () => {
  test('should confirm backend server is responsive', async () => {
    const url = `http://127.0.0.1:${PORT}/api/health`
    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      http.get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data })
        })
      }).on('error', (err) => {
        reject(err)
      })
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' })
  })

  test('should confirm WebSocket server is listening on the configured port', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`)

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.close()
        resolve()
      })

      ws.on('error', (err) => {
        reject(err)
      })
    })
  })
})
