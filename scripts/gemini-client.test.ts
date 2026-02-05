import { cleanJsonOutput, JsonProcessor } from './gemini-client'

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
