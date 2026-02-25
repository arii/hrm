import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import { WebSocket } from 'ws'

export interface ServerProcess {
  process: ChildProcess
  kill: () => Promise<void>
}

export function startServer(
  port: number,
  envOverrides: Record<string, string> = {}
): Promise<ServerProcess> {
  return new Promise((resolve, reject) => {
    // Note: The server should be built by the test script `pnpm run build` before this is called.
    const serverProcess = spawn('node', ['dist/server.js'], {
      env: {
        ...process.env,
        PORT: `${port}`,
        NODE_ENV: 'development',
        NEXTAUTH_SECRET:
          'a-valid-nextauth-secret-for-testing-purposes-long-enough',
        WS_MAX_CONNECTIONS: '100',
        RATE_LIMIT_WINDOW_MS: '60000',
        GENERAL_API_MAX_REQUESTS: '1000',
        ...envOverrides,
      },
      detached: true, // Run in a new process group
    })

    serverProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`[Server STDOUT]: ${data.toString().trim()}`)
    })

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Server STDERR]: ${data.toString().trim()}`)
    })

    // Allow the test runner to exit independently of the server process
    serverProcess.unref()

    const healthCheckUrl = `http://127.0.0.1:${port}/api/health`

    const checkHealth = () => {
      const req = http.get(healthCheckUrl, (res) => {
        if (res.statusCode === 200) {
          console.log(`Server is healthy on port ${port}`)
          clearInterval(interval)
          clearTimeout(timeout)
          resolve({
            process: serverProcess,
            kill: () =>
              new Promise((resolve) => {
                if (serverProcess.pid) {
                  process.kill(-serverProcess.pid, 'SIGKILL')
                }
                resolve()
              }),
          })
        }
      })
      req.on('error', () => {
        // Ignore connection refused errors during startup
      })
    }

    const interval = setInterval(checkHealth, 1000)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      // If the server fails to start, we need to clean up the process
      if (serverProcess.pid) {
        try {
          // Kill the entire process group
          process.kill(-serverProcess.pid, 'SIGKILL')
        } catch {
          // Ignore errors if the process is already gone
        }
      }
      reject(
        new Error(
          `Server failed to start or respond to health check at ${healthCheckUrl} in 120 seconds.`
        )
      )
    }, 120000)
  })
}

export function waitForMessage<T>(
  ws: WebSocket,
  predicate: (msg: T) => boolean,
  timeoutMs: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeListener('message', onMessage)
      reject(new Error('Timeout waiting for message matching predicate'))
    }, timeoutMs)

    function onMessage(data: { toString: () => string }) {
      try {
        const msg = JSON.parse(data.toString()) as T
        if (predicate(msg)) {
          clearTimeout(timeout)
          ws.removeListener('message', onMessage)
          resolve(msg)
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.on('message', onMessage)
  })
}
