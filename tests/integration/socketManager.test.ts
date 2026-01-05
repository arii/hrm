// tests/integration/socketManager.test.ts
import WebSocket from 'ws'
import {
  UnifiedStateMessage,
  TimerCommandMessage,
  HrmInputMessage,
} from '../../types/websocket'
import { startServer, ServerProcess } from './test-helpers'

jest.setTimeout(60000) // 60s timeout for server start and tests

describe('WebSocket Full Integration Test', () => {
  let server: ServerProcess
  const PORT = 3005 // Use a fresh port
  const wsUrl = `ws://127.0.0.1:${PORT}/ws`

  beforeAll(async () => {
    server = await startServer(PORT)
  })

  afterAll(async () => {
    await server.kill()
  })

  it('should handle a full user workflow: connect, send HR, start timer, receive updates, stop timer', (done) => {
    const ws = new WebSocket(wsUrl)
    const receivedMessages: UnifiedStateMessage[] = []

    ws.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString()) as UnifiedStateMessage
      receivedMessages.push(message)
    })

    // Use a sequence of events to test the workflow
    const runWorkflow = async () => {
      // 1. Wait for initial connection and state update
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(receivedMessages.length).toBeGreaterThanOrEqual(1)
      const initialState = receivedMessages[0]
      expect(initialState.type).toBe('STATE_UPDATE')

      // 2. Send HR data
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

      // 3. Start the timer
      const startCommand: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'START',
      }
      ws.send(JSON.stringify(startCommand))
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Wait for prepare phase
      lastMessage = receivedMessages[receivedMessages.length - 1]
      expect(lastMessage.timerData?.isRunning).toBe(true)
      expect(lastMessage.timerData?.currentPhase).toBe('PREPARE')

      // 4. Stop the timer
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
