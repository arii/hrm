/**
 * @jest-environment node
 */
import { main, isTechDebtResponse } from '../identify-tech-debt'
import { readFile, writeFile } from 'fs/promises'
import * as geminiClient from '../gemini-client'

// Mock the external dependencies
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}))

jest.mock('../gemini-client', () => ({
  ...jest.requireActual('../gemini-client'),
  generateContentWithFallback: jest.fn(),
  cleanJsonOutput: jest.fn(),
}))

describe('identify-tech-debt', () => {
  const mockReadFile = readFile as jest.Mock
  const mockWriteFile = writeFile as jest.Mock
  const mockGenerateContent =
    geminiClient.generateContentWithFallback as jest.Mock
  const mockCleanJson = geminiClient.cleanJsonOutput as jest.Mock

  const mockExit = jest
    .spyOn(process, 'exit')
    .mockImplementation((() => {}) as unknown as (code?: number) => never)
  const mockConsoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
    // Mock the argument parsing by setting process.argv
    process.argv = [
      'node',
      'identify-tech-debt.ts',
      '--diff-file',
      'diff.txt',
      '--output',
      'output.json',
    ]
  })

  describe('isTechDebtResponse', () => {
    it('should return true for valid data', () => {
      const data = {
        issues: [{ title: 't', description: 'd', fingerprint: 'f' }],
      }
      expect(isTechDebtResponse(data)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isTechDebtResponse(null)).toBe(false)
      expect(isTechDebtResponse({})).toBe(false)
      expect(isTechDebtResponse({ issues: null })).toBe(false)
      expect(isTechDebtResponse({ issues: [{}] })).toBe(false)
      expect(isTechDebtResponse({ issues: [{ title: 't' }] })).toBe(false)
    })
  })

  it('should successfully process a valid response from the AI', async () => {
    const validResponse = {
      issues: [
        {
          title: 'Test Issue',
          description: 'A test issue',
          fingerprint: 'test-fingerprint',
        },
      ],
    }
    mockReadFile.mockResolvedValue('diff content')
    mockGenerateContent.mockResolvedValue(JSON.stringify(validResponse))
    mockCleanJson.mockReturnValue(JSON.stringify(validResponse))

    await main()

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(validResponse, null, 2)
    )
  })

  it('should handle a malformed JSON response from the AI', async () => {
    mockReadFile.mockResolvedValue('diff content')
    mockGenerateContent.mockResolvedValue('{ "issues": [') // Malformed JSON
    mockCleanJson.mockReturnValue('{ "issues": [')

    await main()

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse valid technical debt JSON')
    )
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ issues: [] }, null, 2)
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('should exit if GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY

    await main()

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error: GEMINI_API_KEY environment variable is not set.'
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('should exit if --diff-file or --output arguments are missing', async () => {
    process.argv = ['node', 'identify-tech-debt.ts'] // No args

    await main()

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Usage:')
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
