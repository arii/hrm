/**
 * @jest-environment node
 */
import { readFileSync } from 'fs'
import { run, IGitHubClient, SuggestedIssue } from '../../../scripts/create-review-issues'

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}))

const mockReadFileSync = readFileSync as jest.Mock

// --- Mock GitHub Client ---

class MockGitHubClient implements IGitHubClient {
  public getOpenIssues = jest.fn()
  public createIssue = jest.fn()
}

describe('create-review-issues.ts', () => {
  let client: MockGitHubClient
  const MOCK_PR_NUMBER = '123'
  const MOCK_FILE_PATH = 'review_result.json'

  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    client = new MockGitHubClient()
    jest.clearAllMocks()

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  const MOCK_VALID_REVIEW_RESULT = {
    reviewComment: 'LGTM!',
    labels: ['bug'],
    verdict: 'approve',
  }

  it('should create an issue when a valid suggestion is found', async () => {
    const issue: SuggestedIssue = {
      title: 'New Issue',
      description: 'A test issue',
      type: 'technical-debt',
      priority: 'medium',
    }
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ ...MOCK_VALID_REVIEW_RESULT, suggestedIssues: [issue] })
    )
    client.getOpenIssues.mockReturnValue([])

    await run(client, MOCK_PR_NUMBER, MOCK_FILE_PATH)

    expect(client.getOpenIssues).toHaveBeenCalledWith('bot-generated')
    expect(client.createIssue).toHaveBeenCalledWith(issue, MOCK_PR_NUMBER)
    expect(consoleLogSpy).toHaveBeenCalledWith('Created: 1')
  })

  it('should skip a duplicate issue by title', async () => {
    const issue: SuggestedIssue = {
      title: 'Duplicate Issue',
      description: 'This is a test.',
      type: 'bug',
      priority: 'high',
    }
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ ...MOCK_VALID_REVIEW_RESULT, suggestedIssues: [issue] })
    )
    client.getOpenIssues.mockReturnValue([{ title: 'Duplicate Issue', number: 1, state: 'OPEN' }])

    await run(client, MOCK_PR_NUMBER, MOCK_FILE_PATH)

    expect(client.createIssue).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith('⏭️  Skipping duplicate: "Duplicate Issue"')
    expect(consoleLogSpy).toHaveBeenCalledWith('Skipped: 1')
  })

  it('should log and exit gracefully if no issues are suggested', async () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ ...MOCK_VALID_REVIEW_RESULT, suggestedIssues: [] })
    )

    await run(client, MOCK_PR_NUMBER, MOCK_FILE_PATH)

    expect(consoleLogSpy).toHaveBeenCalledWith('✨ No suggested issues found in the review result.')
    expect(client.getOpenIssues).not.toHaveBeenCalled()
  })

  it('should handle missing PR_NUMBER', async () => {
    await run(client, '', MOCK_FILE_PATH)
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: PR_NUMBER is missing.')
  })

  it('should handle unreadable review file', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    await run(client, MOCK_PR_NUMBER, MOCK_FILE_PATH)
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error reading review_result.json: File not found')
  })
})
