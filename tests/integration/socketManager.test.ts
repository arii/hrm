// tests/integration/socketManager.test.ts
import WebSocket from 'ws'
import {
  ServerMessage,
  TimerCommandMessage,
  HrmInputMessage,
  HrmUpdateMessage,
  TimerUpdateMessage,
} from '../../types/websocket'
import { startServer, ServerProcess } from './test-helpers'

jest.setTimeout(120000) // 120s timeout for server start and tests

describe('WebSocket Full Integration Test', () => {
  let server: ServerProcess
  const PORT = 3005 // Use a fresh port
  const clientId = 'test-client-123'
  const wsUrl = `ws://127.0.0.1:${PORT}/ws?clientId=${clientId}`

  beforeAll(async () => {
    server = await startServer(PORT)
  })

  afterAll(async () => {
    await server.kill()
  })

  it('should handle a full user workflow: connect, send HR, start timer, receive updates, stop timer', (done) => {
    const ws = new WebSocket(wsUrl)
    let lastHrmUpdate: HrmUpdateMessage | null = null
    let lastTimerUpdate: TimerUpdateMessage | null = null

    ws.on('message', (data: WebSocket.Data) => {
      console.log('Received WS message:', data.toString())
      const message = JSON.parse(data.toString()) as ServerMessage
      if (message.type === 'HRM_UPDATE') {
        lastHrmUpdate = message
      }
      if (message.type === 'TIMER_UPDATE') {
        lastTimerUpdate = message
      }
    })

    // Use a sequence of events to test the workflow
    const runWorkflow = async () => {
      try {
        // 1. Get initial state
        ws.send(JSON.stringify({ type: 'GET_STATE' }))
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 2. Send HR data
        const hrmInput: HrmInputMessage = {
          type: 'HRM_INPUT',
          data: { value: 135, name: 'Workflow Test' },
        }
        ws.send(JSON.stringify(hrmInput))
        await new Promise((resolve) => setTimeout(resolve, 1000))
        expect(lastHrmUpdate).not.toBeNull()
        const clientData = lastHrmUpdate?.payload.find(
          (c) => c.clientId === clientId
        )
        expect(clientData).toBeDefined()
        expect(clientData?.value).toBe(135)

      // 3. Start the timer
      const startCommand: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'START',
      }
      ws.send(JSON.stringify(startCommand))
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Wait for prepare phase
      expect(lastTimerUpdate).not.toBeNull()
      expect(lastTimerUpdate?.payload.isRunning).toBe(true)
      expect(lastTimerUpdate?.payload.phase).toBe('PREPARE')

      // 4. Stop the timer
      const stopCommand: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'STOP',
      }
      ws.send(JSON.stringify(stopCommand))
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(lastTimerUpdate).not.toBeNull()
      expect(lastTimerUpdate?.payload.isRunning).toBe(false)
      expect(lastTimerUpdate?.payload.phase).toBe('IDLE')

      ws.close()
      done()
    }

    ws.on('open', runWorkflow)
    ws.on('error', done)
  })
})
