import { buildReviewPrompt, ReviewContext, cleanJsonOutput } from './gemini-client'
import { readFile } from 'fs/promises'

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}))

const mockedReadFile = readFile as jest.Mock

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

describe('buildReviewPrompt', () => {
  it('should correctly build a review prompt from a template', async () => {
    const mockTemplate = `
# Review for {{prTitle}}
## Description
{{prDescription}}
---
{{truncatedDiff}}
`
    mockedReadFile.mockResolvedValue(mockTemplate)

    const mockContext: ReviewContext = {
      prNumber: '123',
      prTitle: 'Test PR',
      prAuthor: 'Test Author',
      prDescription: 'This is a test PR.\nIt has multiple lines.',
      prLabels: 'bug, needs-review',
      filesChanged: 2,
      totalLoc: 100,
      reviewDepth: 'standard',
      changedAreas: 'frontend, backend',
      reviewCount: 0,
      resolvedCount: 0,
      changesRequested: 0,
      previousReviews: '',
      commitMessages: 'feat: add new feature',
      hasTestChanges: true,
      missingTests: false,
      testFiles: 'test.ts',
      failedChecks: [],
    }

    const mockDiff = 'diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-hello\n+world'
    const mockContextContent = 'This is some context.'

    const prompt = await buildReviewPrompt(mockDiff, mockContext, mockContextContent)

    expect(readFile).toHaveBeenCalledWith('prompts/standard-review.md', 'utf-8')
    expect(prompt).toContain('# Review for Test PR')
    expect(prompt).toContain('## Description\nThis is a test PR.\nIt has multiple lines.')
    expect(prompt).toContain(mockDiff)
    expect(prompt).not.toContain('{{prTitle}}')
  })
})
