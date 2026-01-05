import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import kill from 'tree-kill'

export interface ServerProcess {
  process: ChildProcess
  kill: () => Promise<void>
}

export function startServer(port: number): Promise<ServerProcess> {
  return new Promise((resolve, reject) => {
    // Note: The server should be built by the test script `pnpm run build` before this is called.
    const serverProcess = spawn('node', ['dist/server.js'], {
      env: {
        ...process.env,
        PORT: `${port}`,
        NODE_ENV: 'production',
        WS_MAX_CONNECTIONS: '2',
        RATE_LIMIT_WINDOW_MS: '1000',
        GENERAL_API_MAX_REQUESTS: '5',
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
              new Promise((resolve, reject) => {
                if (serverProcess.pid) {
                  kill(serverProcess.pid, 'SIGKILL', (err) => {
                    if (err) {
                      reject(err)
                    } else {
                      resolve()
                    }
                  })
                } else {
                  resolve()
                }
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
          kill(serverProcess.pid)
        } catch (_e) {
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
