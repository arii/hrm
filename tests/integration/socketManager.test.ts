// tests/integration/socketManager.test.ts
import { spawn, ChildProcess, execSync } from 'child_process'
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
    try {
      execSync('pnpm run build:server', { stdio: 'inherit' })
    } catch (error) {
      return done(error as Error)
    }

    serverProcess = spawn('node', ['dist/server.mjs'], {
      env: { ...process.env, PORT: `${PORT}`, NODE_ENV: 'production' },
      detached: true,
    })

    // Silence verbose server output in tests, but log errors
    serverProcess.stdout?.on('data', (data: Buffer) => console.log(`[Server]: ${data.toString().trim()}`))
    serverProcess.stderr?.on('data', (data: Buffer) =>
      console.error(`[Server ERR]: ${data.toString().trim()}`)
    )
    serverProcess.on('error', (err) => done(err))

    const checkHealth = () => {
      const req = http.get(healthCheckUrl, (res) => {
        if (res.statusCode === 200) {
          console.log('Server is ready.')
          clearInterval(interval)
          clearTimeout(timeout)
          done()
        } else {
          // It can be unhealthy if Spotify isn't configured, but we check for 503 as a valid "running" state.
          if (res.statusCode === 503) {
            console.log(
              'Server is running but unhealthy (as expected without Spotify).'
            )
            clearInterval(interval)
            clearTimeout(timeout)
            done()
          }
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

  it('should handle reconnection and session reclamation', async () => {
    const deviceId = 'device-reconnect-test';

    // 1. Client A connects and sends metadata
    const clientA = new WebSocket(`${wsUrl}?clientId=client-a`);
    await new Promise<void>((resolve) => clientA.on('open', resolve));
    clientA.send(JSON.stringify({ type: 'HRM_METADATA_UPDATE', data: { deviceId, name: 'Client A' } }));
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. Client A disconnects
    clientA.close();
    await new Promise<void>((resolve) => clientA.on('close', resolve));
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for server to process disconnection

    // 3. Client B connects with the same deviceId to reclaim the session
    const clientB = new WebSocket(`${wsUrl}?clientId=client-b`);
    const receivedMessages: UnifiedStateMessage[] = [];
    clientB.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString()) as UnifiedStateMessage;
        receivedMessages.push(message);
    });

    await new Promise<void>((resolve) => clientB.on('open', resolve));
    clientB.send(JSON.stringify({ type: 'HRM_METADATA_UPDATE', data: { deviceId, name: 'Client B' } }));
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. Verify that only one client with the deviceId exists
    const lastMessage = receivedMessages[receivedMessages.length - 1];
    const clientsWithDeviceId = lastMessage.hrmData?.filter((c) => c.deviceId === deviceId);
    expect(clientsWithDeviceId).toHaveLength(1);
    expect(clientsWithDeviceId?.[0].name).toBe('Client B');

    clientB.close();
  });
})
