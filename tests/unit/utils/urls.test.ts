import { convertGoogleDocUrl } from '../../../utils/urls'

describe('convertGoogleDocUrl', () => {
  it('converts a standard /edit URL to an /embed URL', () => {
    const input = 'https://docs.google.com/document/d/DOC_ID/edit'
    const expected = 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'
    expect(convertGoogleDocUrl(input)).toBe(expected)
  })

  it('converts a standard /edit URL with query params to an /embed URL', () => {
    const input = 'https://docs.google.com/document/d/DOC_ID/edit?usp=sharing'
    const expected = 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'
    expect(convertGoogleDocUrl(input)).toBe(expected)
  })

  it('preserves an existing /embed URL and ensures query param is present', () => {
    const input = 'https://docs.google.com/document/d/DOC_ID/embed'
    const expected = 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'
    expect(convertGoogleDocUrl(input)).toBe(expected)
  })

  it('preserves an existing /embed URL that already has ?embedded=true', () => {
    const input = 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'
    const expected = 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'
    expect(convertGoogleDocUrl(input)).toBe(expected)
  })

  it('handles sheets URL', () => {
    const input = 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0'
    const expected = 'https://docs.google.com/spreadsheets/d/SHEET_ID/embed?embedded=true'
    expect(convertGoogleDocUrl(input)).toBe(expected)
  })

  it('returns original string if it does not look like a google doc url', () => {
      const input = 'https://example.com/foo'
      expect(convertGoogleDocUrl(input)).toBe(input)
  })
})
