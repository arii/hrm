import { test, expect } from '@playwright/test'
import { execSync, spawn } from 'child_process'
import net from 'net'
import { WAIT_TIMEOUTS } from './lib/waits'

/**
 * HELPER: Waits for a port to be actively listening.
 * Used to verify servers (dev or prod) have actually started.
 */
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
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeout) {
          clearInterval(interval)
          reject(new Error(`Timeout waiting for port ${port}`))
        }
      })
    }, 500)
  })
}

test.describe('Infrastructure & Scripts', () => {
  // 1. LINT CHECK
  // Ensures you never commit code that violates ESLint rules.
  // Skipping since npm build is already running in ci
  test.skip('npm run lint should pass', () => {
    try {
      // stdio: 'pipe' allows us to capture output if it fails
      execSync('npm run lint', { stdio: 'pipe' })
    } catch (error: unknown) {
      const execError = error as {
        status: number
        stdout: Buffer
        stderr: Buffer
      }
      console.error('Lint Output:', execError.stdout?.toString())
      console.error('Lint Errors:', execError.stderr?.toString())
      throw new Error(`Linting failed with status ${execError.status}`)
    }
  })

  // 2. BUILD VERIFICATION
  // Verifies the server compilation step (TS -> JS) works.
  test.skip('build:server should compile successfully', () => {
    const start = Date.now()
    // Using ignore for stdio to keep test logs clean unless it throws
    execSync('npm run build:server', { stdio: 'ignore' })
    expect(Date.now() - start).toBeLessThan(30000) // Fail if build takes > 30s
  })

  // 3. DEV SERVER TEST
  // Spawns the real dev server on a unique port to ensure it boots.
  test('npm run dev should start and listen', async () => {
    test.setTimeout(WAIT_TIMEOUTS.INFRASTRUCTURE * 2) // Server startup timeout

    const PORT = 3005
    const devServer = spawn('npm', ['run', 'dev'], {
      detached: true, // Use detached to create a process group
      stdio: 'pipe',
      env: { ...process.env, PORT: String(PORT) },
    })

    // Capture stdout and stderr to log them on failure
    let stdout = ''
    let stderr = ''
    devServer.stdout.on('data', (data) => (stdout += data.toString()))
    devServer.stderr.on('data', (data) => (stderr += data.toString()))

    try {
      await waitForPort(PORT)
    } catch (error) {
      // If waitForPort fails, log the server output and re-throw
      console.error('DEV SERVER STDOUT:\n', stdout)
      console.error('DEV SERVER STDERR:\n', stderr)
      throw error // Re-throw the original error to fail the test
    } finally {
      // Cleanup: Kill the entire process group.
      // The `-` before devServer.pid is crucial; it kills the group, not just the parent process.
      try {
        if (devServer.pid) process.kill(-devServer.pid)
      } catch (_e) {
        // Ignore errors, likely "ESRCH" if the process already terminated.
      }
    }
  })

  // 4. PRODUCTION SCRIPT TEST
  // Runs the exact shell script used in production (start-production.sh).
  test('start-production.sh should start successfully', async () => {
    test.setTimeout(WAIT_TIMEOUTS.INFRASTRUCTURE * 2)

    const PORT = 3006
    // Mock env vars usually provided by .env.production
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      NEXTAUTH_SECRET: 'test-secret-mock',
      NEXTAUTH_URL: `http://localhost:${PORT}`,
    }

    const prodServer = spawn('./scripts/start-production.sh', [], {
      detached: true,
      stdio: 'pipe',
      env,
    })

    let stdout = ''
    let stderr = ''
    prodServer.stdout.on('data', (data) => (stdout += data.toString()))
    prodServer.stderr.on('data', (data) => (stderr += data.toString()))

    try {
      await waitForPort(PORT)
    } catch (error) {
      console.error('PROD SERVER STDOUT:\n', stdout)
      console.error('PROD SERVER STDERR:\n', stderr)
      throw error
    } finally {
      try {
        if (prodServer.pid) process.kill(-prodServer.pid)
      } catch (_e) {
        // Ignore errors
      }
    }
  })
})
