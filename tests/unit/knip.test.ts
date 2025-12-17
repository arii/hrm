import { execSync } from 'child_process'

describe('knip', () => {
  it('should have no unlisted dependencies', () => {
    try {
      execSync('pnpm exec knip', { stdio: 'inherit' })
    } catch (_error) {
      // The error object will contain the output of the command, which will show the knip report.
      // We can fail the test with a custom message to make it clear that knip found issues.
      fail(
        'knip found unlisted dependencies. See the output above for details.'
      )
    }
  })
})
