/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { execSync } from 'child_process'
import * as geminiClient from '../../../scripts/gemini-client'
import { main as detectDuplicates } from '../../../scripts/detect-duplicates'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

jest.mock('../../../scripts/gemini-client', () => ({
  generateContentWithFallback: jest.fn(),
  cleanJsonOutput: jest.fn((text) => text),
}))

const mockedExecSync = execSync as jest.Mock
const mockedGenerateContent =
  geminiClient.generateContentWithFallback as jest.Mock

describe('detect-duplicates script', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GH_TOKEN = 'test-token'
  })

  it('should post comments for detected duplicate issues', async () => {
    const issues = [
      { number: 1, title: 'First issue' },
      { number: 2, title: 'Second issue' },
      { number: 3, title: 'First issue' },
    ]
    mockedExecSync.mockReturnValue(JSON.stringify(issues))
    mockedGenerateContent.mockResolvedValue(
      JSON.stringify({ duplicates: [[1, 3]] })
    )

    await detectDuplicates()

    expect(mockedExecSync).toHaveBeenCalledWith(
      'gh issue list --state open --json number,title --limit 100'
    )
    expect(mockedGenerateContent).toHaveBeenCalled()
    expect(mockedExecSync).toHaveBeenCalledWith(
      'gh issue comment 1 --body "Possible duplicates found by AI: #3"',
      { env: { ...process.env, GH_TOKEN: 'test-token' } }
    )
  })

  it('should handle cases where no duplicates are found', async () => {
    const issues = [
      { number: 1, title: 'First issue' },
      { number: 2, title: 'Second issue' },
    ]
    mockedExecSync.mockReturnValue(JSON.stringify(issues))
    mockedGenerateContent.mockResolvedValue(JSON.stringify({ duplicates: [] }))

    await detectDuplicates()

    expect(mockedExecSync).toHaveBeenCalledTimes(1)
    expect(mockedGenerateContent).toHaveBeenCalled()
    expect(mockedExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('gh issue comment')
    )
  })

  it('should handle malformed AI responses with Zod', async () => {
    const issues = [
      { number: 1, title: 'Test' },
      { number: 2, title: 'Another Test' },
    ]
    mockedExecSync.mockReturnValue(JSON.stringify(issues))
    mockedGenerateContent.mockResolvedValue('{"duplicates": [[1, "a"]]}')

    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as any)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await detectDuplicates()

    expect(errorSpy).toHaveBeenCalledWith(
      'AI response failed validation:',
      expect.any(Object)
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should not comment if a comment fails', async () => {
    const issues = [
      { number: 1, title: 'First issue' },
      { number: 2, title: 'Second issue' },
      { number: 3, title: 'First issue' },
    ]
    mockedExecSync.mockReturnValueOnce(JSON.stringify(issues))
    mockedExecSync.mockImplementationOnce(() => {
      throw new Error('Failed to comment')
    })

    mockedGenerateContent.mockResolvedValue(
      JSON.stringify({ duplicates: [[1, 3]] })
    )

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await detectDuplicates()

    expect(errorSpy).toHaveBeenCalledWith(
      '  ❌ Failed to post comment on #1:',
      'Failed to comment'
    )
  })
})
