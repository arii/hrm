// tests/integration/socketManager.test.ts
import { spawn, ChildProcess, execSync } from 'child_process'
import WebSocket from 'ws'
import http from 'http'
import {
  ServerMessage,
  TimerCommandMessage,
  HrmInputMessage,
} from '../../types/websocket'
import { HrmStreamData } from '../../types/core'

// Helper to wait for a specific message that satisfies a predicate
const waitForMessage = (
  ws: WebSocket,
  predicate: (msg: ServerMessage) => boolean,
  timeout = 5000
): Promise<ServerMessage> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener('message', messageHandler)
      reject(new Error(`Timeout waiting for message after ${timeout}ms`))
    }, timeout)

    const messageHandler = (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString()) as ServerMessage
      if (predicate(message)) {
        clearTimeout(timer)
        ws.removeListener('message', messageHandler)
        resolve(message)
      }
    }

    ws.on('message', messageHandler)
  })
}

jest.setTimeout(60000) // 60s timeout for server start and tests

describe('WebSocket Full Integration Test', () => {
  let serverProcess: ChildProcess
  const PORT = 3005 // Use a fresh port
  const wsUrl = `ws://127.0.0.1:${PORT}/ws`
  const healthCheckUrl = `http://127.0.0.1:${PORT}/api/internal/health/services`

  beforeAll((done) => {
    try {
      execSync('pnpm run build:server', { stdio: 'inherit' })
    } catch (error) {
      return done(error as Error)
    }

    serverProcess = spawn('node', ['dist/server.mjs'], {
      env: { ...process.env, PORT: `${PORT}`, NODE_ENV: 'production' },
      detached: true,
    })

    serverProcess.stderr?.on('data', (data: Buffer) =>
      console.error(`[Server ERR]: ${data.toString().trim()}`)
    )
    serverProcess.on('error', (err) => done(err))

    const checkHealth = () => {
      const req = http.get(healthCheckUrl, (res) => {
        // The server is "ready" even if unhealthy (e.g., Spotify disconnected),
        // as long as it's running and responding.
        if (res.statusCode && res.statusCode < 599) {
          console.log(`Server is running (Status: ${res.statusCode}).`)
          clearInterval(interval)
          clearTimeout(timeout)
          done()
        }
      })
      req.on('error', () => {}) // Ignore connection errors while polling
    }

    const interval = setInterval(checkHealth, 1000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      done(
        new Error(
          `Server failed to start or respond to health check in 50 seconds.`
        )
      )
    }, 50000)
  })

  afterAll((done) => {
    if (serverProcess && serverProcess.pid) {
      serverProcess.on('close', done)
      try {
        process.kill(-serverProcess.pid, 'SIGTERM')
      } catch (_e) {
        done() // Process already gone
      }
    } else {
      done()
    }
  })

  it('should handle a full user workflow: connect, send HR, start timer, receive updates, stop timer', async () => {
    const ws = new WebSocket(wsUrl)

    // Wait for the WebSocket to open before proceeding
    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })

    // 1. Get initial state (server sends updates automatically on connect)
    // We'll wait for the timer update as a signal of readiness.
    const initialState = await waitForMessage(
      ws,
      (msg) => msg.type === 'TIMER_UPDATE'
    )
    expect(initialState.type).toBe('TIMER_UPDATE')

    // 2. Send HR data and wait for the corresponding HRM_UPDATE
    const hrmInput: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: { value: 135 },
    }
    ws.send(JSON.stringify(hrmInput))

    const hrmUpdate = await waitForMessage(ws, (msg) => {
      if (msg.type !== 'HRM_UPDATE') return false
      return msg.payload.some((client: HrmStreamData) => client.value === 135)
    })
    const clientData = (hrmUpdate.payload as HrmStreamData[]).find(
      (c) => c.value === 135
    )
    expect(clientData).toBeDefined()

    // 3. Start the timer and wait for the PREPARE phase update
    const startCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'START',
    }
    ws.send(JSON.stringify(startCommand))

    const timerStartUpdate = await waitForMessage(ws, (msg) => {
      if (msg.type !== 'TIMER_UPDATE') return false
      return msg.payload.currentPhase === 'PREPARE'
    })
    expect(timerStartUpdate.payload.isRunning).toBe(true)
    expect(timerStartUpdate.payload.currentPhase).toBe('PREPARE')

    // 4. Stop the timer and wait for the IDLE phase update
    const stopCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'STOP',
    }
    ws.send(JSON.stringify(stopCommand))

    const timerStopUpdate = await waitForMessage(ws, (msg) => {
      if (msg.type !== 'TIMER_UPDATE') return false
      return msg.payload.currentPhase === 'IDle'
    })
    expect(timerStopUpdate.payload.isRunning).toBe(false)
    expect(timerStopUpdate.payload.currentPhase).toBe('IDLE')

    ws.close()
  })
})
