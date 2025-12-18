import { execSync } from 'child_process'

describe('knip', () => {
  it('should have no unlisted dependencies', () => {
    try {
      execSync('pnpm exec knip', { stdio: 'inherit' })
    } catch (_error) {
      // The error object contains the knip report. We throw an error to fail the test,
      // which is the standard way to programmatically fail a Jest test.
      // This will also stop the test suite, which is desirable since dependency
      // issues can cause other tests to fail in misleading ways.
      throw new Error(
        'knip found unlisted dependencies. See the output above for details.'
      )
    }
  })
})
