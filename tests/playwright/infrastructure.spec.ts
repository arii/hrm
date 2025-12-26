import { test, expect } from '@playwright/test'
import { execSync, spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { WAIT_TIMEOUTS } from './lib/waits'
import waitOn from 'wait-on'

/**
 * Enhanced waitForPort using the `wait-on` package.
 * It's more robust and specifically designed for this purpose.
 */
const waitForPort = async (
  port: number,
  timeout = WAIT_TIMEOUTS.INFRASTRUCTURE
) => {
  try {
    await waitOn({
      resources: [`tcp:127.0.0.1:${port}`],
      timeout,
      verbose: false, // Set to true for debugging flaky tests
    })
  } catch (error) {
    // Re-throw a more informative error, including the stack trace
    const err = error as Error
    throw new Error(
      `Timeout waiting for port ${port}. Error: ${err.message}\nStack: ${err.stack}`
    )
  }
}

test.describe('Infrastructure & Scripts', () => {
  // 1. LINT CHECK
  // Ensures you never commit code that violates ESLint rules.
  // Skipping since pnpm build is already running in ci
  test.skip('pnpm run lint should pass', () => {
    try {
      // stdio: 'pipe' allows us to capture output if it fails
      execSync('pnpm run lint', { stdio: 'pipe' })
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
    execSync('pnpm run build:server', { stdio: 'ignore' })
    expect(Date.now() - start).toBeLessThan(30000) // Fail if build takes > 30s
  })

  // 3. DEV SERVER TEST
  // Spawns the real dev server on a unique port to ensure it boots.
  test('pnpm run dev should start and listen', async () => {
    test.setTimeout(WAIT_TIMEOUTS.INFRASTRUCTURE * 2) // Server startup timeout

    // Clean up .next/ directory to prevent "lock file" errors from previous runs
    const nextDir = path.join(process.cwd(), '.next')
    try {
      await fs.rm(nextDir, { recursive: true, force: true })
    } catch (error) {
      console.warn(`Could not remove .next directory: ${error}`)
    }

    const PORT = 3005
    const devServer = spawn('pnpm', ['run', 'dev'], {
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
