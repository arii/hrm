import { GoogleGenerativeAIError } from '@google/generative-ai'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import {
  applyPlaceholders,
  buildFallbackReview,
  buildInvalidJsonReview,
  buildReviewPrompt,
  buildTestCoverageAlert,
  cleanJsonOutput,
  handleError,
  isThinReview,
  extractThoughtSignature,
  getRetriableReason,
  loadContextFiles,
  normalizeReviewData,
  readMetricsAndTestsFromEnv,
  readPrIdentityFromEnv,
  readReviewStateFromEnv,
  ReviewContext,
  FailedCheck,
  JsonProcessor,
  shouldSkipReview,
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

describe('shouldSkipReview', () => {
  it.each([
    ['ai-reviewed', true],
    ['abandon', true],
    ['ai-reviewed,approved', true],
    ['test-label', false],
    ['', false],
  ])('prLabels %p skips: %p', (prLabels, expected) => {
    expect(shouldSkipReview(prLabels)).toBe(expected)
  })
})

describe('isThinReview', () => {
  it.each([
    [{}, true],
    [{ reviewComment: '' }, true],
    [{ reviewComment: 'short' }, true],
    [{ reviewComment: '   ' }, true],
    [{ reviewComment: 'x'.repeat(19) }, true],
    [{ reviewComment: 'x'.repeat(20) }, false],
    [{ reviewComment: 'a thorough review comment here' }, false],
  ])('%p is thin: %p', (reviewData, expected) => {
    expect(isThinReview(reviewData)).toBe(expected)
  })
})

describe('normalizeReviewData', () => {
  const prContext = {
    repo: 'o/r',
    prNumber: '1',
    branchName: 'b',
    commitHash: 'abc',
  }

  it('appends the commit marker and context', () => {
    const result = normalizeReviewData(
      { reviewComment: 'x'.repeat(30), verdict: 'approve', labels: [] },
      'sig-1',
      prContext,
      '\n\n> Reviewed at commit: `abc`'
    )
    expect(result.reviewComment).toContain('> Reviewed at commit: `abc`')
    expect(result.prContext).toEqual(prContext)
    expect(result.thoughtSignature).toBe('sig-1')
  })

  it('keeps an existing thought signature', () => {
    const result = normalizeReviewData(
      {
        reviewComment: 'x'.repeat(30),
        verdict: 'comment',
        labels: [],
        thoughtSignature: 'original-sig',
      },
      'new-sig',
      prContext,
      ''
    )
    expect(result.thoughtSignature).toBe('original-sig')
  })

  it.each([
    [{ verdict: 'approve', labels: [] }, 'approve', ['approved']],
    [{ verdict: 'comment', labels: [] }, 'comment', ['not approved']],
    [{ verdict: undefined, labels: undefined }, 'comment', ['not approved']],
    [{ verdict: 'approve', labels: ['approved'] }, 'approve', ['approved']],
    [
      { verdict: 'comment', labels: ['not approved'] },
      'comment',
      ['not approved'],
    ],
  ])('defaults %p to verdict %p labels %p', (input, verdict, labels) => {
    const result = normalizeReviewData(
      { reviewComment: 'x'.repeat(30), ...input },
      undefined,
      prContext,
      ''
    )
    expect(result.verdict).toBe(verdict)
    expect(result.labels).toEqual(labels)
  })

  it('does not mutate its input', () => {
    const input = { reviewComment: 'x'.repeat(30), labels: [] as string[] }
    normalizeReviewData(input, undefined, prContext, '')
    expect(input).toEqual({ reviewComment: 'x'.repeat(30), labels: [] })
  })
})

describe('buildFallbackReview', () => {
  it('builds the verification-complete approval', () => {
    const result = buildFallbackReview('> Reviewed at commit: `abc`')
    expect(result.verdict).toBe('approve')
    expect(result.labels).toEqual(['ai-reviewed', 'approved'])
    expect(result.reviewComment).toContain('Verification Complete')
    expect(result.reviewComment).toContain('> Reviewed at commit: `abc`')
  })
})

describe('buildInvalidJsonReview', () => {
  it('builds the structured parse-failure output', () => {
    const details = { error: 'unexpected token' }
    const result = buildInvalidJsonReview(
      'RAW {{{',
      details,
      '> Reviewed at commit: `abc`'
    )
    expect(result.verdict).toBe('comment')
    expect(result.labels).toEqual(['ci-failure', 'not reviewed'])
    expect(result.error.category).toBe('Invalid JSON Response')
    expect(result.error.details).toBe(details)
    expect(result.reviewComment).toContain('RAW {{{')
    expect(result.reviewComment).toContain('> Reviewed at commit: `abc`')
  })

  it('tolerates a missing raw response', () => {
    const result = buildInvalidJsonReview(undefined, null, '')
    expect(result.reviewComment).toContain('```\n\n```')
  })
})

describe('buildTestCoverageAlert', () => {
  it('warns when source changed without tests', () => {
    expect(
      buildTestCoverageAlert({
        missingTests: true,
        hasTestChanges: false,
      })
    ).toContain('TEST COVERAGE ALERT')
  })

  it('confirms when tests were updated', () => {
    expect(
      buildTestCoverageAlert({
        missingTests: false,
        hasTestChanges: true,
        testFiles: 'a.test.ts',
      })
    ).toContain('a.test.ts')
  })

  it('stays silent otherwise', () => {
    expect(
      buildTestCoverageAlert({ missingTests: false, hasTestChanges: false })
    ).toBe('')
  })
})

describe('applyPlaceholders', () => {
  it('replaces every placeholder occurrence', () => {
    expect(
      applyPlaceholders('{{a}} and {{a}} plus {{b}}', { a: 'A', b: 'B' })
    ).toBe('A and A plus B')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(applyPlaceholders('{{known}} {{other}}', { known: 'K' })).toBe(
      'K {{other}}'
    )
  })
})

describe('readPrIdentityFromEnv', () => {
  it('maps PR identity fields with empty defaults', () => {
    const prev = { ...process.env }
    try {
      process.env.PR_NUMBER = '42'
      process.env.PR_TITLE = 'Fix it'
      process.env.PR_AUTHOR = 'octo'
      process.env.PR_DESCRIPTION = 'desc'
      process.env.PR_LABELS = 'a,b'
      process.env.PR_BRANCH_NAME = 'feat/x'
      process.env.COMMIT_MESSAGES = 'm1'
      process.env.COMMIT_HASH = 'abc123'
      expect(readPrIdentityFromEnv()).toEqual({
        prNumber: '42',
        prTitle: 'Fix it',
        prAuthor: 'octo',
        prDescription: 'desc',
        prLabels: 'a,b',
        prBranchName: 'feat/x',
        commitMessages: 'm1',
        commitHash: 'abc123',
      })
      delete process.env.PR_NUMBER
      delete process.env.COMMIT_HASH
      expect(readPrIdentityFromEnv().prNumber).toBe('')
      expect(readPrIdentityFromEnv().commitHash).toBe('')
    } finally {
      process.env = prev
    }
  })
})

describe('readReviewStateFromEnv', () => {
  it('maps review state with validated depth and int counts', () => {
    const prev = { ...process.env }
    try {
      delete process.env.FAILED_CHECKS_JSON
      delete process.env.LINKED_ISSUE_BODY
      delete process.env.ISSUE_TITLE
      process.env.REVIEW_DEPTH = 'focused'
      process.env.REVIEW_COUNT = '3'
      process.env.RESOLVED_COUNT = '1'
      process.env.CHANGES_REQUESTED = '0'
      process.env.PREVIOUS_REVIEWS = 'r1'
      process.env.ISSUE_NUMBER = '7'
      const state = readReviewStateFromEnv()
      expect(state.reviewDepth).toBe('focused')
      expect(state.reviewCount).toBe(3)
      expect(state.previousReviews).toBe('r1')
      expect(state.issueNumber).toBe('7')
      expect(state.failedChecks).toEqual([])
      process.env.REVIEW_DEPTH = 'bogus'
      expect(readReviewStateFromEnv().reviewDepth).toBe('standard')
    } finally {
      process.env = prev
    }
  })
})

describe('readMetricsAndTestsFromEnv', () => {
  it('combines git metrics with test flags', () => {
    const prev = { ...process.env }
    try {
      process.env.HAS_TEST_CHANGES = 'true'
      process.env.MISSING_TESTS = 'false'
      process.env.TEST_FILES = 'a.test.ts'
      process.env.SLOP_ANALYSIS = 'clean'
      const state = readMetricsAndTestsFromEnv({
        filesChanged: 5,
        totalLoc: 100,
        changedAreas: 'app/',
      })
      expect(state).toEqual({
        filesChanged: 5,
        totalLoc: 100,
        changedAreas: 'app/',
        hasTestChanges: true,
        missingTests: false,
        testFiles: 'a.test.ts',
        slopAnalysis: 'clean',
        thoughtSignature: undefined,
      })
    } finally {
      process.env = prev
    }
  })
})

describe('loadContextFiles', () => {
  it('concatenates readable files and marks missing ones', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'gemini-ctx-'))
    try {
      const file = path.join(dir, 'a.md')
      writeFileSync(file, 'hello context')
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const out = await loadContextFiles([
          file,
          '  ',
          path.join(dir, 'missing.md'),
        ])
        expect(out).toContain('hello context')
        expect(out).toContain('Start of Context File')
        expect(out).toContain('MISSING/ERROR')
        expect(warn).toHaveBeenCalled()
      } finally {
        warn.mockRestore()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('getRetriableReason', () => {
  it.each([
    ['429: rate limited', 429, 'Rate Limited'],
    ['quota 429 exceeded', undefined, 'Rate Limited'],
    ['503 upstream', 503, 'Infrastructure Issue'],
    ['got 500', undefined, 'Infrastructure Issue'],
    ['404 missing', 404, 'Not Found'],
    ['400 bad request', 400, 'Invalid Request'],
    ['401 unauthorized', 401, null],
    ['some other failure', undefined, null],
    ['', undefined, null],
  ])('%p (status %p) -> %p', (message, status, expected) => {
    expect(getRetriableReason(message, status)).toBe(expected)
  })
})

describe('extractThoughtSignature', () => {
  it('captures the signature when present', () => {
    expect(
      extractThoughtSignature({
        candidates: [{ thought_signature: 'sig-9' }],
      })
    ).toBe('sig-9')
  })

  it.each([[{}], [{ candidates: [] }], [{ candidates: [{}] }]])(
    'returns undefined for %p',
    (response) => {
      expect(extractThoughtSignature(response)).toBeUndefined()
    }
  )
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
