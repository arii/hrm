import { GoogleGenerativeAIError } from '@google/generative-ai'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import {
  buildReviewPrompt,
  cleanJsonOutput,
  handleError,
  ReviewContext,
  FailedCheck,
  JsonProcessor,
} from '../../../scripts/gemini-client'

describe('JsonProcessor', () => {
  let processor: JsonProcessor

  beforeEach(() => {
    processor = new JsonProcessor()
    // Recovery-path tests intentionally log warnings; keep output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should parse valid JSON and ensure labels field exists', () => {
    const input = '{"reviewComment": "Looks good"}'
    const result = processor.process(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      reviewComment: 'Looks good',
      labels: [],
    })
  })

  it('should not overwrite existing labels field', () => {
    const input = '{"reviewComment": "Needs work", "labels": ["bug"]}'
    const result = processor.process(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      reviewComment: 'Needs work',
      labels: ['bug'],
    })
  })

  it('should handle JSON within a markdown block', () => {
    const input = '```json\n{"reviewComment": "Great job!"}\n```'
    const result = processor.process(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      reviewComment: 'Great job!',
      labels: [],
    })
  })

  it('should return an error for invalid JSON', () => {
    const input = '{"reviewComment": "Missing quote}'
    const result = processor.process(input)
    expect(result.success).toBe(false)
    expect(result.data).toHaveProperty('error')
  })
  it('should return an error for invalid JSON that is not just truncated', () => {
    // Note: My current tryRepair might actually fix this if it's at the end of the string
    // Let's use something truly broken
    const brokenInput = '{"reviewComment": "valid", [broken]}'
    const result = processor.process(brokenInput)
    expect(result.success).toBe(false)
    expect(result.data).toHaveProperty('error')
  })

  it('should attempt recovery for truncated JSON', () => {
    const input = '{"reviewComment": "This comment was cut off'
    const result = processor.process(input)
    expect(result.success).toBe(true)
    const data = result.data as { reviewComment: string; labels: string[] }
    expect(data.reviewComment).toBe('This comment was cut off')
    expect(data.labels).toEqual([])
  })

  it('should attempt recovery for truncated JSON with partial labels', () => {
    const input = '{"reviewComment": "Good", "labels": ["bug"'
    const result = processor.process(input)
    expect(result.success).toBe(true)
    const data = result.data as { reviewComment: string; labels: string[] }
    expect(data.reviewComment).toBe('Good')
    expect(data.labels).toEqual(['bug'])
  })
})

describe('cleanJsonOutput', () => {
  it('should remove markdown code blocks with "json" identifier', () => {
    const input = '```json\n{"key": "value"}\n```'
    const expected = '{"key": "value"}'
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should remove markdown code blocks without an identifier', () => {
    const input = '```\n{"key": "value"}\n```'
    const expected = '{"key": "value"}'
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should return the string trimmed if no markdown block is present', () => {
    const input = '  {"key": "value"}  '
    const expected = '{"key": "value"}'
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should handle an empty string', () => {
    const input = ''
    const expected = ''
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should handle a string with only whitespace', () => {
    const input = '   \n\t   '
    const expected = ''
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should handle a string with only empty markdown fences', () => {
    const input = '```json\n```'
    const expected = ''
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should handle a string with just the fences', () => {
    const input = '```json```'
    const expected = ''
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should handle content before and after the markdown block', () => {
    const input =
      'Here is the JSON:\n```json\n{"key": "value"}\n```\nLet me know what you think.'
    const expected = '{"key": "value"}'
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should return the original string if it contains ``` but not as a block', () => {
    const input = 'This is a string with ``` inside it.'
    const expected = 'This is a string with ``` inside it.'
    expect(cleanJsonOutput(input)).toBe(expected)
  })

  it('should handle content with extra whitespace in the fences', () => {
    const input = '```json\n   {"key": "value"}   \n```'
    const expected = '{"key": "value"}'
    expect(cleanJsonOutput(input)).toBe(expected)
  })
})

const createMockContext = (
  overrides: Partial<ReviewContext> = {}
): ReviewContext => ({
  prNumber: '123',
  prTitle: 'Test PR',
  prAuthor: 'test-author',
  prDescription: 'This is a test PR.',
  prLabels: 'test-label',
  filesChanged: 1,
  totalLoc: 10,
  reviewDepth: 'standard',
  changedAreas: 'test-area',
  reviewCount: 0,
  resolvedCount: 0,
  changesRequested: 0,
  previousReviews: '',
  commitMessages: 'feat: test commit',
  hasTestChanges: false,
  missingTests: false,
  failedChecks: [],
  ...overrides,
})

describe('buildReviewPrompt', () => {
  it('should generate a standard review prompt', async () => {
    const mockContext = createMockContext()
    const prompt = await buildReviewPrompt(
      'test diff',
      mockContext,
      'test context'
    )
    expect(prompt).toContain('# Code Review: Initial Review')
    expect(prompt).not.toContain('CI Failure Analysis')
  })

  it('should generate a standard review prompt with a linked issue', async () => {
    const contextWithIssue = createMockContext({
      linkedIssueBody: 'This is a test issue.',
      issueNumber: '456',
      issueTitle: 'Test Issue',
    })
    const prompt = await buildReviewPrompt(
      'test diff',
      contextWithIssue,
      'test context'
    )
    expect(prompt).toContain('## Description')
    expect(prompt).toContain('**Linked Issue**: #456')
  })

  it('should generate a fix mode prompt when there are failed checks', async () => {
    const failedChecks: FailedCheck[] = [
      {
        name: 'test-check',
        conclusion: 'failure',
        detailsUrl: 'http://test.com',
      },
    ]
    const contextWithFailures = createMockContext({ failedChecks })
    const prompt = await buildReviewPrompt(
      'test diff',
      contextWithFailures,
      'test context'
    )
    expect(prompt).toContain('CI Failure Analysis')
    expect(prompt).toContain('Task: Fix the Build')
    expect(prompt).toContain('- **test-check** (failure)')
  })

  it('should include slop analysis in the prompt when provided', async () => {
    const slopAnalysis = 'This is a test slop analysis.'
    const contextWithSlop = createMockContext({ slopAnalysis })
    const prompt = await buildReviewPrompt(
      'test diff',
      contextWithSlop,
      'test context'
    )
    expect(prompt).toContain('## AI Slop Analysis')
    expect(prompt).toContain(slopAnalysis)
  })

  it('should truncate over-long diff and failure logs with markers', async () => {
    const failedChecks: FailedCheck[] = [
      {
        name: 'big-check',
        conclusion: 'failure',
        detailsUrl: '',
        logSnippet: 'L'.repeat(16000),
      },
    ]
    const prompt = await buildReviewPrompt(
      'D'.repeat(40000),
      createMockContext({ failedChecks }),
      'test context'
    )
    expect(prompt).toContain('[DIFF TRUNCATED]')
    expect(prompt).toContain('[LOGS TRUNCATED]')
  })

  it('should truncate over-long slop analysis with a marker', async () => {
    const prompt = await buildReviewPrompt(
      'test diff',
      createMockContext({ slopAnalysis: 'S'.repeat(3000) }),
      'test context'
    )
    expect(prompt).toContain('...[TRUNCATED]')
    expect(prompt).not.toContain('S'.repeat(3000))
  })
})

describe('handleError', () => {
  let exitSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never)
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const loggedJson = (): string => (errorSpy.mock.calls[0]?.[1] as string) ?? ''

  it('classifies api-key errors as configuration issues and exits 1 without a file', async () => {
    await handleError(new Error('Invalid api key provided'), null)
    expect(loggedJson()).toContain('"category": "Configuration Issue"')
    expect(loggedJson()).toContain('GEMINI_API_KEY is either invalid')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('classifies string errors as infrastructure issues with the string as details', async () => {
    await handleError('something broke', null)
    expect(loggedJson()).toContain('"category": "Infrastructure Issue"')
    expect(loggedJson()).toContain('something broke')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('classifies retryable model errors as temporary outages', async () => {
    await handleError(new GoogleGenerativeAIError('Request failed [503]'), null)
    expect(loggedJson()).toContain('"category": "Infrastructure Issue"')
    expect(loggedJson()).toContain('temporarily unavailable')
  })

  it('writes structured output and exits 0 when a file is given', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'gemini-err-'))
    try {
      const out = path.join(dir, 'out.json')
      await handleError(new Error('boom'), out)
      const written = JSON.parse(readFileSync(out, 'utf8'))
      expect(written.error.category).toBe('Infrastructure Issue')
      expect(written.verdict).toBe('comment')
      expect(exitSpy).toHaveBeenCalledWith(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
