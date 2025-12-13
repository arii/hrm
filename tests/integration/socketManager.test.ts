// tests/integration/socketManager.test.ts
import { spawn, ChildProcess } from 'child_process'
import WebSocket from 'ws'
import http from 'http'
import {
  UnifiedStateMessage,
  TimerCommandMessage,
  HrmInputMessage,
} from '../../types/websocket'

jest.setTimeout(60000) // 60s timeout for server start and tests

describe('WebSocket Full Integration Test', () => {
  let serverProcess: ChildProcess
  const PORT = 3005 // Use a fresh port
  const wsUrl = `ws://127.0.0.1:${PORT}/ws`
  const healthCheckUrl = `http://127.0.0.1:${PORT}/health/ready`

  beforeAll((done) => {
    serverProcess = spawn('node', ['dist/server.mjs'], {
      env: {
        ...process.env,
        PORT: `${PORT}`,
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-for-socket-manager-test',
        TESTING: 'true',
      },
      detached: true,
    })

    serverProcess.stdout?.on('data', (_data: Buffer) => {})
    serverProcess.stderr?.on('data', (data: Buffer) =>
      console.error(`[Server ERR]: ${data.toString().trim()}`)
    )
    serverProcess.on('error', (err) => done(err))

    const checkHealth = () => {
      const req = http.get(healthCheckUrl, (res) => {
        if (res.statusCode === 200 || res.statusCode === 503) {
          clearInterval(interval)
          clearTimeout(timeout)
          done()
        }
      })
      req.on('error', () => {})
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
      try {
        process.kill(-serverProcess.pid, 'SIGKILL')
      } catch (_e) {
        /* ignore */
      }
    }
    setTimeout(done, 500)
  })

  it('should handle a full user workflow: connect, send HR, start timer, receive updates, stop timer', (done) => {
    const ws = new WebSocket(wsUrl)
    const receivedMessages: UnifiedStateMessage[] = []

    ws.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString()) as UnifiedStateMessage
      receivedMessages.push(message)
    })

    const runWorkflow = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(receivedMessages.length).toBeGreaterThanOrEqual(1)
      const initialState = receivedMessages[0]
      expect(initialState.type).toBe('STATE_UPDATE')

      const hrmInput: HrmInputMessage = {
        type: 'HRM_INPUT',
        data: { value: 135, name: 'Workflow Test' },
      }
      ws.send(JSON.stringify(hrmInput))
      await new Promise((resolve) => setTimeout(resolve, 500))
      let lastMessage = receivedMessages[receivedMessages.length - 1]
      const clientData = lastMessage.hrmData?.find(
        (c) => c.name === 'Workflow Test'
      )
      expect(clientData).toBeDefined()
      expect(clientData?.value).toBe(135)

      const startCommand: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'START',
      }
      ws.send(JSON.stringify(startCommand))
      await new Promise((resolve) => setTimeout(resolve, 1500))
      lastMessage = receivedMessages[receivedMessages.length - 1]
      expect(lastMessage.timerData?.isRunning).toBe(true)
      expect(lastMessage.timerData?.currentPhase).toBe('PREPARE')

      const stopCommand: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'STOP',
      }
      ws.send(JSON.stringify(stopCommand))
      await new Promise((resolve) => setTimeout(resolve, 500))
      lastMessage = receivedMessages[receivedMessages.length - 1]
      expect(lastMessage.timerData?.isRunning).toBe(false)
      expect(lastMessage.timerData?.currentPhase).toBe('IDLE')

      ws.close()
      done()
    }

    ws.on('open', runWorkflow)
    ws.on('error', done)
  })
})
