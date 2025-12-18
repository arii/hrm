// tests/integration/socketManager.test.ts
import { spawn, ChildProcess, execSync } from 'child_process'
import WebSocket from 'ws'
import http from 'http'
import {
  UnifiedStateMessage,
  TimerCommandMessage,
  HrmInputMessage,
  MessageType,
} from '../../types/websocket'

// Increased timeout for CI environments where server startup can be slow.
jest.setTimeout(60000)

/**
 * A utility function to wait for a specific WebSocket message.
 * @param ws The WebSocket instance.
 * @param messageType The type of the message to wait for.
 * @param condition A function to evaluate the message payload.
 * @returns A promise that resolves with the parsed message.
 */
function waitForSocketMessage<T extends UnifiedStateMessage>(
  ws: WebSocket,
  messageType: MessageType,
  condition: (message: T) => boolean = () => true
): Promise<T> {
  return new Promise((resolve, reject) => {
    const messageHandler = (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as T
        if (message.type === messageType && condition(message)) {
          ws.removeListener('message', messageHandler)
          resolve(message)
        }
      } catch (err) {
        // Ignore parsing errors for messages that are not of the expected type
      }
    }

    const errorHandler = (err: Error) => {
      ws.removeListener('message', messageHandler)
      reject(err)
    }

    ws.on('message', messageHandler)
    ws.on('error', errorHandler)
  })
}

/**
 * Polls the server's health check endpoint until it's ready.
 * @param url The health check URL.
 * @param timeout The maximum time to wait.
 * @returns A promise that resolves when the server is ready.
 */
const waitForServerReady = (url: string, timeout: number): Promise<void> => {
  const endTime = Date.now() + timeout
  return new Promise((resolve, reject) => {
    const checkHealth = () => {
      const req = http.get(url, (res) => {
        // The server is considered "ready" even if it's unhealthy (503),
        // which is expected when secrets like Spotify keys are missing.
        if (res.statusCode === 200 || res.statusCode === 503) {
          return resolve()
        }
        scheduleNextCheck()
      })

      req.on('error', scheduleNextCheck)
    }

    const scheduleNextCheck = () => {
      if (Date.now() > endTime) {
        return reject(
          new Error(
            `Server failed to start or respond to health check in ${
              timeout / 1000
            } seconds.`
          )
        )
      }
      setTimeout(checkHealth, 1000)
    }

    checkHealth()
  })
}

describe('WebSocket Full Integration Test', () => {
  let serverProcess: ChildProcess
  const PORT = 3005
  const wsUrl = `ws://127.0.0.1:${PORT}/ws`
  const healthCheckUrl = `http://127.0.0.1:${PORT}/health/ready`

  beforeAll(async () => {
    // Build the server before starting
    try {
      execSync('pnpm run build:server', { stdio: 'pipe' })
    } catch (error) {
      const err = error as Error & { stdout: Buffer; stderr: Buffer }
      console.error('Server build failed:', err.stderr.toString())
      throw err
    }

    serverProcess = spawn('node', ['dist/server.mjs'], {
      env: { ...process.env, PORT: `${PORT}`, NODE_ENV: 'production' },
      detached: true, // Use detached mode to create a process group
    })

    serverProcess.stderr?.on('data', (data: Buffer) =>
      console.error(`[Server ERR]: ${data.toString().trim()}`)
    )

    // Wait for the server to become ready by polling the health check endpoint.
    await waitForServerReady(healthCheckUrl, 50000)
  })

  afterAll((done) => {
    if (serverProcess && serverProcess.pid) {
      // Kill the entire process group to ensure the server and any child processes are terminated.
      try {
        process.kill(-serverProcess.pid, 'SIGKILL')
      } catch (_e) {
        // Ignore errors if the process is already gone
      }
    }
    // The 'close' event confirms the process has terminated.
    serverProcess.on('close', () => done())
  })

  it('should handle a full user workflow: connect, send HR, start timer, receive updates, stop timer', async () => {
    const ws = new WebSocket(wsUrl)

    // Wait for the connection to open
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })

    // 1. Wait for the initial STATE_UPDATE message
    const initialState = await waitForSocketMessage(ws, 'STATE_UPDATE')
    expect(initialState).toBeDefined()
    expect(initialState.type).toBe('STATE_UPDATE')

    // 2. Send HR data and wait for the corresponding update
    const hrmInput: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: { value: 135, name: 'Workflow Test' },
    }
    ws.send(JSON.stringify(hrmInput))

    const hrmUpdate = await waitForSocketMessage<UnifiedStateMessage>(
      ws,
      'STATE_UPDATE',
      (message) =>
        message.hrmData?.some((c) => c.name === 'Workflow Test') ?? false
    )
    const clientData = hrmUpdate.hrmData?.find(
      (c) => c.name === 'Workflow Test'
    )
    expect(clientData).toBeDefined()
    expect(clientData?.value).toBe(135)

    // 3. Start the timer and wait for the 'PREPARE' phase update
    const startCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'START',
    }
    ws.send(JSON.stringify(startCommand))

    const timerStartUpdate = await waitForSocketMessage<UnifiedStateMessage>(
      ws,
      'STATE_UPDATE',
      (message) => message.timerData?.currentPhase === 'PREPARE'
    )
    expect(timerStartUpdate.timerData?.isRunning).toBe(true)

    // 4. Stop the timer and wait for the 'IDLE' phase update
    const stopCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'STOP',
    }
    ws.send(JSON.stringify(stopCommand))

    const timerStopUpdate = await waitForSocketMessage<UnifiedStateMessage>(
      ws,
      'STATE_UPDATE',
      (message) => message.timerData?.currentPhase === 'IDLE'
    )
    expect(timerStopUpdate.timerData?.isRunning).toBe(false)

    ws.close()
  })
})
