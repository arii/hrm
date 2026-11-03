import { redactSecrets } from '../../../scripts/redact-secrets'

describe('redactSecrets', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('leaves plain text untouched', () => {
    expect(redactSecrets('hello workout world')).toBe('hello workout world')
  })

  it('redacts GitHub token patterns', () => {
    const token = 'ghp_' + 'a'.repeat(40)
    expect(redactSecrets(`key=${token} end`)).toBe('key=***REDACTED*** end')
  })

  it('redacts secret-looking env var values', () => {
    process.env.TEST_API_KEY = 'super-secret-value-12345'
    expect(redactSecrets('using super-secret-value-12345 now')).toBe(
      'using ***REDACTED*** now'
    )
  })

  it('redacts consistently across repeated calls', () => {
    const token = 'ghp_' + 'b'.repeat(40)
    const input = `key=${token}`
    expect(redactSecrets(input)).toBe(redactSecrets(input))
    expect(redactSecrets(input)).toContain('***REDACTED***')
  })
})
