/* global describe, beforeEach, afterEach, it, expect */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
const execAsync = promisify(exec)

// Define the path to the script to be tested
const scriptPath = path.resolve(
  __dirname,
  '../../.github/scripts/analyze-changes.sh'
)
// Define a temporary path for the GITHUB_ENV file
const envFilePath = path.resolve(__dirname, 'test_github_env')

describe('analyze-changes.sh', () => {
  // Set up a mock git environment before each test
  beforeEach(async () => {
    // Clean up the environment file before each test
    if (fs.existsSync(envFilePath)) {
      fs.unlinkSync(envFilePath)
    }

    // Create a temporary git repository for testing
    await execAsync('git init')
    await execAsync('git config user.email "test@example.com"')
    await execAsync('git config user.name "Test User"')
    await execAsync('git commit --allow-empty -m "Initial commit"')
    await execAsync('git commit --allow-empty -m "Second commit"')
  })

  // Clean up the mock git environment after each test
  afterEach(async () => {
    // Clean up the environment file after each test
    if (fs.existsSync(envFilePath)) {
      fs.unlinkSync(envFilePath)
    }
    // Remove the temporary git repository
    await execAsync('rm -rf .git')
  })

  // Test case for a normal push (not a rebase)
  it('should use GITHUB_EVENT_BEFORE for PREVIOUS_COMMIT on a normal push', async () => {
    // Get the commit SHAs for the test
    const headSha = await execAsync('git rev-parse HEAD')
    const beforeSha = await execAsync('git rev-parse HEAD^')

    // Set the environment variables for the script
    const env = {
      ...process.env,
      GITHUB_EVENT_AFTER: headSha.stdout.trim(),
      PULL_REQUEST_HEAD_SHA: headSha.stdout.trim(),
      GITHUB_EVENT_BEFORE: beforeSha.stdout.trim(),
      PULL_REQUEST_BASE_SHA: beforeSha.stdout.trim(),
      GITHUB_ENV: envFilePath,
    }

    // Execute the script
    await execAsync(`bash ${scriptPath}`, { env })

    // Read the output from the environment file
    const envFileContent = fs.readFileSync(envFilePath, 'utf8')

    // Parse the environment file to get the PREVIOUS_COMMIT
    const previousCommitLine = envFileContent
      .split('\n')
      .find((line) => line.startsWith('PREVIOUS_COMMIT='))
    const previousCommit = previousCommitLine
      ? previousCommitLine.split('=')[1].trim()
      : ''

    // Assert that PREVIOUS_COMMIT is the same as the 'before' SHA
    expect(previousCommit).toBe(beforeSha.stdout.trim())
  })

  // Test case for a rebased push
  it('should use the merge-base for PREVIOUS_COMMIT on a rebased push', async () => {
    // Get the commit SHAs for the test
    const headSha = await execAsync('git rev-parse HEAD')
    const baseSha = await execAsync('git rev-parse HEAD^')

    // Set the environment variables for the script
    const env = {
      ...process.env,
      GITHUB_EVENT_AFTER: headSha.stdout.trim(),
      PULL_REQUEST_HEAD_SHA: headSha.stdout.trim(),
      GITHUB_EVENT_BEFORE: 'invalid_sha', // Simulate a rebase with an invalid 'before' SHA
      PULL_REQUEST_BASE_SHA: baseSha.stdout.trim(),
      GITHUB_ENV: envFilePath,
    }

    // Execute the script
    await execAsync(`bash ${scriptPath}`, { env })

    // Read the output from the environment file
    const envFileContent = fs.readFileSync(envFilePath, 'utf8')

    // Parse the environment file to get the PREVIOUS_COMMIT
    const previousCommitLine = envFileContent
      .split('\n')
      .find((line) => line.startsWith('PREVIOUS_COMMIT='))
    const previousCommit = previousCommitLine
      ? previousCommitLine.split('=')[1].trim()
      : ''

    // Calculate the expected merge-base
    const mergeBase = await execAsync(
      `git merge-base ${headSha.stdout.trim()} ${baseSha.stdout.trim()}`
    )

    // Assert that PREVIOUS_COMMIT is the merge-base
    expect(previousCommit).toBe(mergeBase.stdout.trim())
  })
})
