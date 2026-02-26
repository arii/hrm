// tests/integration/socketManager.test.ts
import WebSocket from 'ws'
import {
  ServerMessage,
  TimerCommandMessage,
  HrmInputMessage,
} from '../../types/websocket'
import { startServer, ServerProcess, waitForMessage } from './test-helpers'

jest.setTimeout(20000) // 20s timeout for server start and tests

describe('WebSocket Full Integration Test', () => {
  let server: ServerProcess
  const PORT = 3005
  const wsUrl = `ws://127.0.0.1:${PORT}/ws`

  beforeAll(async () => {
    server = await startServer(PORT)
  })

  afterAll(async () => {
    await server.kill()
  })

  it('should handle a full user workflow: connect, send HR, start timer, receive updates, stop timer', async () => {
    const ws = new WebSocket(wsUrl)
    await new Promise((resolve) => ws.on('open', resolve))

    // 1. Get initial state
    const initialStatePromise = waitForMessage<ServerMessage>(
      ws,
      (msg) => msg.type === 'INITIAL_STATE'
    )
    ws.send(JSON.stringify({ type: 'GET_STATE' }))
    const initialState = (await initialStatePromise) as Extract<
      ServerMessage,
      { type: 'INITIAL_STATE' }
    >
    expect(initialState.type).toBe('INITIAL_STATE')

    // 2. Send HR data and wait for the update
    const hrUpdatePromise = waitForMessage<ServerMessage>(
      ws,
      (msg) =>
        msg.type === 'HRM_UPDATE' &&
        msg.payload.some((c) => c.name === 'Workflow Test' && c.value === 135)
    )
    const hrmInput: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: { value: 135, name: 'Workflow Test' },
    }
    ws.send(JSON.stringify(hrmInput))
    const hrUpdate = (await hrUpdatePromise) as Extract<
      ServerMessage,
      { type: 'HRM_UPDATE' }
    >
    const clientData = hrUpdate.payload.find((c) => c.name === 'Workflow Test')
    expect(clientData).toBeDefined()
    expect(clientData?.value).toBe(135)

    // 3. Start the timer and wait for the PREPARE phase
    const prepareUpdatePromise = waitForMessage<ServerMessage>(
      ws,
      (msg) =>
        msg.type === 'TIMER_UPDATE' &&
        msg.payload.isRunning === true &&
        msg.payload.currentPhase === 'PREPARE'
    )
    const startCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'START',
    }
    ws.send(JSON.stringify(startCommand))
    const prepareUpdate = (await prepareUpdatePromise) as Extract<
      ServerMessage,
      { type: 'TIMER_UPDATE' }
    >
    expect(prepareUpdate.payload.isRunning).toBe(true)
    expect(prepareUpdate.payload.currentPhase).toBe('PREPARE')

    // 4. Stop the timer and wait for the IDLE phase
    const stopUpdatePromise = waitForMessage<ServerMessage>(
      ws,
      (msg) =>
        msg.type === 'TIMER_UPDATE' &&
        msg.payload.isRunning === false &&
        msg.payload.currentPhase === 'IDLE'
    )
    const stopCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'STOP',
    }
    ws.send(JSON.stringify(stopCommand))
    const stopUpdate = (await stopUpdatePromise) as Extract<
      ServerMessage,
      { type: 'TIMER_UPDATE' }
    >
    expect(stopUpdate.payload.isRunning).toBe(false)
    expect(stopUpdate.payload.currentPhase).toBe('IDLE')

    ws.close()
  })

  it('should retain session if client reconnects within grace period', async () => {
    const clientId = 'grace-period-test-client'
    const wsUrlWithId = `${wsUrl}?clientId=${clientId}`

    // 1. First connection
    const ws1 = new WebSocket(wsUrlWithId)
    await new Promise((resolve) => ws1.on('open', resolve))

    // Send some data to establish the session
    const ackPromise = waitForMessage<ServerMessage>(
      ws1,
      (msg) =>
        msg.type === 'HRM_UPDATE' &&
        msg.payload.some((c) => c.clientId === clientId)
    )
    const hrmInput: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: { value: 150, name: 'Grace Test' },
    }
    ws1.send(JSON.stringify(hrmInput))
    await ackPromise

    // 2. Disconnect abruptly
    ws1.terminate()

    // 3. Reconnect within the grace period (default is 5s)
    const ws2 = new WebSocket(wsUrlWithId)
    await new Promise((resolve) => ws2.on('open', resolve))

    // 4. Verify that the session data still exists
    const finalStatePromise = waitForMessage<ServerMessage>(
      ws2,
      (msg) =>
        msg.type === 'HRM_UPDATE' &&
        msg.payload.some(
          (c) => c.clientId === clientId && c.name === 'Grace Test'
        )
    )
    const hrmInput2: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: { value: 151 },
    }
    ws2.send(JSON.stringify(hrmInput2))
    const finalState = (await finalStatePromise) as Extract<
      ServerMessage,
      { type: 'HRM_UPDATE' }
    >

    const clientData = finalState.payload.find((c) => c.clientId === clientId)
    expect(clientData).toBeDefined()
    expect(clientData?.name).toBe('Grace Test')
    expect(clientData?.value).toBe(151)

    ws2.close()
  })

  it('should delete session if client fails to reconnect within grace period', async () => {
    const clientId = 'cleanup-test-client'
    const wsUrlWithId = `${wsUrl}?clientId=${clientId}`

    // 1. First connection
    const ws1 = new WebSocket(wsUrlWithId)
    await new Promise((resolve) => ws1.on('open', resolve))
    const ackPromise = waitForMessage<ServerMessage>(
      ws1,
      (msg) =>
        msg.type === 'HRM_UPDATE' &&
        msg.payload.some((c) => c.clientId === clientId)
    )
    ws1.send(
      JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 120, name: 'Cleanup Test' },
      })
    )
    await ackPromise
    ws1.terminate()

    // 2. Wait for longer than the grace period (5s) + buffer (1s)
    await new Promise((resolve) => setTimeout(resolve, 6000))

    // 3. Reconnect and check that the session is fresh
    const ws2 = new WebSocket(wsUrlWithId)
    await new Promise((resolve) => ws2.on('open', resolve))

    // Send a new name to make the new session visible (filter-passable)
    ws2.send(
      JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 0, name: 'New Session' },
      })
    )

    const statePromise = waitForMessage<ServerMessage>(
      ws2,
      (msg) => msg.type === 'INITIAL_STATE'
    )
    ws2.send(JSON.stringify({ type: 'GET_STATE' }))
    const state = (await statePromise) as Extract<
      ServerMessage,
      { type: 'INITIAL_STATE' }
    >

    const clientData = state.payload.hrmData.find(
      (c) => c.clientId === clientId
    )
    expect(clientData).toBeDefined()
    expect(clientData?.name).toBe('New Session')
    expect(clientData?.value).toBe(0)

    ws2.close()
  })
})
