import { GoogleGenerativeAI } from '@google/generative-ai'
import { parseConflicts } from '@/scripts/utils/git-conflicts'
import { readFile } from 'fs/promises'
import { mocked } from 'jest-mock'
import * as geminiClient from '@/scripts/gemini-client'

jest.mock('@google/generative-ai')
jest.mock('@/scripts/utils/git-conflicts')
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}))

const mockedJsonProcessorProcess = jest.fn()
jest.mock('@/scripts/gemini-client', () => ({
  generateContentWithFallback: jest.fn(),
  handleError: jest.fn(),
  writeOutput: jest.fn(),
  JsonProcessor: jest.fn().mockImplementation(() => {
    return { process: mockedJsonProcessorProcess }
  }),
}))

const mockedParseConflicts = mocked(parseConflicts)
const mockedGoogleGenerativeAI = mocked(GoogleGenerativeAI)
const mockedReadFile = mocked(readFile)

// It's important to use the mocked namespace to get the typed mock functions
const mockedGenerateContentWithFallback = mocked(
  geminiClient.generateContentWithFallback
)
const mockedHandleError = mocked(geminiClient.handleError)
const mockedWriteOutput = mocked(geminiClient.writeOutput)

describe('runConflictResolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGoogleGenerativeAI.mockImplementation(
      () =>
        ({
          getGenerativeModel: () => ({
            generateContent: jest.fn(),
          }),
        }) as jest.Mock
    )
  })

  it('should generate a report for valid conflicts', async () => {
    const { runConflictResolution } =
      await import('@/scripts/conflict-resolver')
    mockedReadFile.mockResolvedValue('file1.ts\0file2.ts\0')
    mockedParseConflicts
      .mockResolvedValueOnce([
        {
          id: 'conflict-1',
          file: 'pr-code/file1.ts',
          startLine: 1,
          endLine: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'conflict-2',
          file: 'pr-code/file2.ts',
          startLine: 10,
          endLine: 12,
        },
      ])
    mockedGenerateContentWithFallback.mockResolvedValue('some generated text')
    mockedJsonProcessorProcess
      .mockReturnValueOnce({
        success: true,
        data: [{ id: 'conflict-1', resolution: 'ab' }],
      })
      .mockReturnValueOnce({
        success: true,
        data: [{ id: 'conflict-2', resolution: 'cd' }],
      })

    await runConflictResolution(
      new GoogleGenerativeAI(''),
      'conflicts.txt',
      'report.md'
    )

    expect(mockedWriteOutput).toHaveBeenCalledTimes(1)
    const writtenContent = mockedWriteOutput.mock.calls[0][0] as string
    expect(writtenContent).toContain('### 📂 `pr-code/file1.ts` (Lines 1-3)')
    expect(writtenContent).toContain('### 📂 `pr-code/file2.ts` (Lines 10-12)')
    expect(mockedHandleError).not.toHaveBeenCalled()
  })

  it('should handle malformed AI response', async () => {
    const { runConflictResolution } =
      await import('@/scripts/conflict-resolver')
    mockedReadFile.mockResolvedValue('file1.ts\0')
    mockedParseConflicts.mockResolvedValueOnce([
      {
        id: 'conflict-1',
        file: 'file1.ts',
        startLine: 1,
        endLine: 3,
      },
    ])
    mockedGenerateContentWithFallback.mockResolvedValue('not json')
    mockedJsonProcessorProcess.mockReturnValue({
      success: false,
      data: { error: 'test error' },
    })

    await runConflictResolution(
      new GoogleGenerativeAI(''),
      'conflicts.txt',
      'report.md'
    )

    expect(mockedHandleError).toHaveBeenCalledWith(
      new Error('Failed to parse AI resolution JSON')
    )
    // It should still try to write a report, even if one file fails.
    expect(mockedWriteOutput).toHaveBeenCalledTimes(1)
  })
})
