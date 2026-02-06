import {
  buildReviewPrompt,
  cleanJsonOutput,
  ReviewContext,
  FailedCheck,
  JsonProcessor,
} from '../../../scripts/gemini-client'

describe('JsonProcessor', () => {
  let processor: JsonProcessor

  beforeEach(() => {
    processor = new JsonProcessor()
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
    expect(prompt).toContain('# Code Review Task: Initial Review')
    expect(prompt).not.toContain('IMMEDIATE ACTION REQUIRED')
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
    expect(prompt).toContain('## Issue Description')
    expect(prompt).toContain('Linked Issue #456')
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
    expect(prompt).toContain('IMMEDIATE ACTION REQUIRED')
    expect(prompt).toContain('You are now in **DEBUG MODE**')
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
})
