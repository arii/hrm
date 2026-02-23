import { extractGoogleDocId } from '../../../utils/urls'

describe('extractGoogleDocId', () => {
  it('should extract a valid Google Doc ID from a URL', () => {
    const url =
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    expect(extractGoogleDocId(url)).toBe(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    )
  })

  it('should return undefined for undefined input', () => {
    expect(extractGoogleDocId(undefined)).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    expect(extractGoogleDocId('')).toBeUndefined()
  })

  it('should return undefined for URL without /d/', () => {
    const url = 'https://google.com'
    expect(extractGoogleDocId(url)).toBeUndefined()
  })

  it('should return undefined for short IDs (less than 25 chars)', () => {
    const url = 'https://docs.google.com/d/shortID'
    expect(extractGoogleDocId(url)).toBeUndefined()
  })

  it('should extract ID even with different URL structures', () => {
    // Standard IDs are usually 44 chars (base64-ish).
    const longId = 'a'.repeat(25)
    const url2 = `https://docs.google.com/presentation/d/${longId}/edit`
    expect(extractGoogleDocId(url2)).toBe(longId)
  })
})
