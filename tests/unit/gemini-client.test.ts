/**
 * @jest-environment node
 */
import {
  buildReviewPrompt,
  getModelFallbacks,
  getSpecializedRules,
  JsonProcessor,
  ReviewContext,
} from '../../scripts/gemini-client'
import { readFile } from 'fs/promises'

// Mock the readFile function
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}))
const mockedReadFile = readFile as jest.Mock

describe('JsonProcessor', () => {
  const processor = new JsonProcessor()

  it('should parse a valid JSON string', () => {
    const jsonString = '{"key": "value", "number": 123}'
    const result = processor.process(jsonString)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: 'value', number: 123 })
  })

  it('should extract and parse a JSON block from markdown', () => {
    const markdownString =
      'Some text before\n```json\n{"key": "value"}\n```\nSome text after'
    const result = processor.process(markdownString)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: 'value' })
  })

  it('should return an error for invalid JSON', () => {
    const invalidJson = '{"key": "value",}'
    const result = processor.process(invalidJson)
    expect(result.success).toBe(false)
    expect(result.data.error).toBe('JSON Parse Error')
  })

  it('should return an error for a malformed JSON block in markdown', () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const markdownString = '```json\n{"key": "value",}\n```'
    const result = processor.process(markdownString)
    expect(result.success).toBe(false)
    expect(result.data.error).toBe('JSON Parse Error')
    consoleErrorSpy.mockRestore()
  })

  it('should return an error if no JSON is found', () => {
    const nonJsonString = 'This is just a regular string.'
    const result = processor.process(nonJsonString)
    expect(result.success).toBe(false)
    expect(result.data.error).toBe('JSON Parse Error')
  })
})

describe('getModelFallbacks', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return the default fallback list when the environment variable is not set', () => {
    delete process.env.GEMINI_MODEL_FALLBACKS
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro',
    ])
  })

  it('should return the correct list of models from a valid environment variable', () => {
    process.env.GEMINI_MODEL_FALLBACKS =
      'gemini-pro, gemini-pro-vision, gemini-ultra'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra',
    ])
  })

  it('should filter out invalid model names and log a warning', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    process.env.GEMINI_MODEL_FALLBACKS =
      'gemini-pro, not-gemini, gemini-ultra, also-not-gemini'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual(['gemini-pro', 'gemini-ultra'])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: Invalid model name "not-gemini" in GEMINI_MODEL_FALLBACKS. It will be ignored.'
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: Invalid model name "also-not-gemini" in GEMINI_MODEL_FALLBACKS. It will be ignored.'
    )
    consoleWarnSpy.mockRestore()
  })

  it('should return the default list if the environment variable is an empty string', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    process.env.GEMINI_MODEL_FALLBACKS = ''
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro',
    ])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    consoleWarnSpy.mockRestore()
  })

  it('should return the default list if the environment variable contains only invalid models', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    process.env.GEMINI_MODEL_FALLBACKS = 'invalid1, invalid2'
    const fallbacks = getModelFallbacks()
    expect(fallbacks).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro',
    ])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    consoleWarnSpy.mockRestore()
  })
})

describe('getSpecializedRules', () => {
  it('should return an empty string if no relevant files are changed', () => {
    const changedFiles = ['src/component.tsx', 'README.md']
    const rules = getSpecializedRules(changedFiles)
    expect(rules).toBe('')
  })

  it('should return WebSocket rules for WebSocket-related file changes', () => {
    const changedFiles = ['server.ts', 'src/other.ts']
    const rules = getSpecializedRules(changedFiles)
    expect(rules).toContain('### ⚡ Real-Time & WebSocket Focus:')
    expect(rules).not.toContain('### 🔐 Authentication & Session Focus:')
  })

  it('should return Authentication rules for auth-related file changes', () => {
    const changedFiles = ['lib/auth.ts', 'src/other.ts']
    const rules = getSpecializedRules(changedFiles)
    expect(rules).not.toContain('### ⚡ Real-Time & WebSocket Focus:')
    expect(rules).toContain('### 🔐 Authentication & Session Focus:')
  })

  it('should return both rule sets when files from both categories are changed', () => {
    const changedFiles = ['utils/socketManager.ts', 'app/api/auth/route.ts']
    const rules = getSpecializedRules(changedFiles)
    expect(rules).toContain('### ⚡ Real-Time & WebSocket Focus:')
    expect(rules).toContain('### 🔐 Authentication & Session Focus:')
  })
})

describe('buildReviewPrompt', () => {
  const baseContext: ReviewContext = {
    prNumber: '123',
    prTitle: 'Test PR',
    prAuthor: 'test-author',
    prDescription: 'Test description',
    prLabels: 'test-label',
    filesChanged: 1,
    totalLoc: 10,
    reviewDepth: 'standard',
    changedAreas: 'test-area',
    reviewCount: 0,
    resolvedCount: 0,
    changesRequested: 0,
    previousReviews: 'None',
    commitMessages: 'feat: test commit',
    commitHash: 'testhash',
    hasTestChanges: false,
    missingTests: true,
    failedChecks: [],
  }

  beforeEach(() => {
    mockedReadFile.mockClear()
  })

  it('should load review.md and inject specialized rules when no failures', async () => {
    const reviewTemplate =
      'This is the review template. {{specializedRules}} {{prTitle}}'
    mockedReadFile.mockResolvedValueOnce(reviewTemplate)

    const context: ReviewContext = {
      ...baseContext,
      changedAreas: 'server.ts, lib/auth.ts',
    }

    const prompt = await buildReviewPrompt('test diff', context, 'test context')

    expect(mockedReadFile).toHaveBeenCalledWith('prompts/review.md', 'utf-8')
    expect(prompt).toContain('### ⚡ Real-Time & WebSocket Focus:')
    expect(prompt).toContain('### 🔐 Authentication & Session Focus:')
    expect(prompt).toContain('Test PR')
  })

  it('should fall back to standard-review.md if review.md is not found', async () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    const standardTemplate = 'This is the standard template. {{prTitle}}'
    mockedReadFile
      .mockRejectedValueOnce(new Error('File not found'))
      .mockResolvedValueOnce(standardTemplate)

    const prompt = await buildReviewPrompt(
      'test diff',
      baseContext,
      'test context'
    )

    expect(mockedReadFile).toHaveBeenCalledWith('prompts/review.md', 'utf-8')
    expect(mockedReadFile).toHaveBeenCalledWith(
      'prompts/standard-review.md',
      'utf-8'
    )
    expect(prompt).not.toContain('{{specializedRules}}')
    expect(prompt).toContain('Test PR')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning: 'prompts/review.md' not found. Falling back to legacy templates."
    )
    consoleWarnSpy.mockRestore()
  })

  it('should generate a fix mode prompt when there are failed checks', async () => {
    const fixModeTemplate =
      'IMMEDIATE ACTION REQUIRED. You are now in **DEBUG MODE**. Failures: {{failureList}}'
    mockedReadFile.mockResolvedValue(fixModeTemplate)

    const context: ReviewContext = {
      ...baseContext,
      failedChecks: [
        {
          name: 'test-check',
          conclusion: 'failure',
          detailsUrl: 'http://test.com',
          logSnippet: 'Test log snippet',
        },
      ],
    }

    const prompt = await buildReviewPrompt('test diff', context, 'test context')
    expect(mockedReadFile).toHaveBeenCalledWith('prompts/fix-mode.md', 'utf-8')
    expect(prompt).toContain('IMMEDIATE ACTION REQUIRED')
    expect(prompt).toContain('You are now in **DEBUG MODE**')
    expect(prompt).toContain('- **test-check** (failure)')
  })
})
