// @ts-nocheck
import { test, expect } from './lib'
import { spawn } from 'child_process'

test.describe('Infrastructure', () => {
  test('should start the server in production mode', async () => {
    const serverProcess = spawn('npm', ['start'])
    let output = ''
    serverProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    serverProcess.stderr.on('data', (data) => {
      output += data.toString()
    })

    await new Promise((resolve) => setTimeout(resolve, 5000))

    expect(output).toContain('Ready on http://127.0.0.1:3000')

    serverProcess.kill()
  })
})
