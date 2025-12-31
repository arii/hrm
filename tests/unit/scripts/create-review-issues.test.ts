/**
 * @jest-environment node
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import {
  main,
  GitHubClient,
  isDuplicate,
  SuggestedIssue,
  ExistingIssue,
} from '../../../scripts/create-review-issues'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}))

const mockExecSync = execSync as jest.Mock
const mockReadFileSync = readFileSync as jest.Mock

describe('create-review-issues.ts', () => {
  const MOCK_PR_NUMBER = '123'
  const MOCK_REPO = 'test/repo'
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let processExitSpy: jest.SpyInstance

  const MOCK_VALID_REVIEW_RESULT = {
    reviewComment: 'LGTM!',
    labels: ['bug'],
    verdict: 'approve',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PR_NUMBER = MOCK_PR_NUMBER
    process.env.GITHUB_REPOSITORY = MOCK_REPO
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as (code?: number) => never)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  it('should create an issue when a valid suggestion is found', async () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        ...MOCK_VALID_REVIEW_RESULT,
        suggestedIssues: [
          {
            title: 'New Issue',
            description: 'A test issue',
            type: 'technical-debt',
            priority: 'medium',
          },
        ],
      })
    )
    mockExecSync.mockReturnValueOnce(JSON.stringify([]))
    mockExecSync.mockReturnValueOnce('https://github.com/test/repo/issues/1')

    await main()

    expect(mockExecSync).toHaveBeenCalledWith(
      `gh issue list --state open --json number,title,state,body --limit 100 --label "bot-generated"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(
        /^gh issue create --title-file ".*" --body-file ".*" --label "bot-generated,triage-needed,type-technical-debt,priority-medium"$/
      ),
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ Issue created')
    )
  })

  it('should skip a duplicate issue', async () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        ...MOCK_VALID_REVIEW_RESULT,
        suggestedIssues: [
          {
            title: 'Duplicate Issue',
            description: 'This should be skipped',
            type: 'bug',
            priority: 'high',
          },
        ],
      })
    )
    mockExecSync.mockReturnValueOnce(
      JSON.stringify([
        {
          title: 'Duplicate Issue',
          body: 'This should be skipped',
          number: 1,
          state: 'OPEN',
        },
      ])
    )

    await main()

    expect(mockExecSync).toHaveBeenCalledTimes(1)
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('⏭️  Skipping duplicate')
    )
  })

  it('should handle case with no suggested issues', async () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ ...MOCK_VALID_REVIEW_RESULT, suggestedIssues: [] })
    )

    await main()

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '✨ No suggested issues found in the review result.'
    )
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should exit if the review result JSON is invalid', async () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        // Missing 'labels' and 'verdict'
        reviewComment: 'This is a comment.',
      })
    )

    await main()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('❌ Error validating review_result.json:'),
      expect.any(Object)
    )
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  describe('GitHubClient', () => {
    let client: GitHubClient

    beforeEach(() => {
      client = new GitHubClient()
    })

    it('should throw an error on execSync failure', () => {
      const error = new Error('Command failed') as { stderr?: string }
      error.stderr = 'Something went wrong'
      mockExecSync.mockImplementation(() => {
        throw error
      })

      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client as any).execute('some-command')
      ).toThrow('GitHub CLI Error: Something went wrong')
    })
  })

  describe('isDuplicate', () => {
    it('should return true for identical issues', () => {
      const newIssue: SuggestedIssue = {
        title: 'Test',
        description: 'Body',
        type: 'bug',
        priority: 'high',
      }
      const existing: ExistingIssue[] = [
        { title: 'Test', body: 'Body', number: 1, state: 'OPEN' },
      ]
      expect(isDuplicate(newIssue, existing)).toBe(true)
    })
    it('should return false for different issues', () => {
      const newIssue: SuggestedIssue = {
        title: 'Test',
        description: 'Body',
        type: 'bug',
        priority: 'high',
      }
      const existing: ExistingIssue[] = [
        { title: 'Different', body: 'Body', number: 1, state: 'OPEN' },
      ]
      expect(isDuplicate(newIssue, existing)).toBe(false)
    })
  })
})
