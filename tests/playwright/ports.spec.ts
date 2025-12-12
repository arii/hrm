import { test, expect } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import net from 'net'
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
  serverProcess = spawn('npm', ['run', 'dev'], {
    detached: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  })
  await waitForPort(PORT)
  console.log('Server started for port tests.')
})

test.afterAll(async () => {
  console.log('Stopping server for port tests...')
  if (serverProcess.pid) {
    try {
      process.kill(-serverProcess.pid)
    } catch (e) {
      console.error('Failed to kill server process for port tests:', e)
    }
  }
  console.log('Server stopped for port tests.')
})

test.describe('Port Health Checks', () => {
  test('should confirm backend server is listening on the configured port', async () => {
    await expect(waitForPort(PORT)).resolves.toBeUndefined()
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
