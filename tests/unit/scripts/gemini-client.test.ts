
import { buildReviewPrompt, ReviewContext } from '@/scripts/gemini-client'

// Mock ReviewContext for testing
const mockContext: ReviewContext = {
  prNumber: '123',
  prTitle: 'Test PR',
  prAuthor: 'test-user',
  prDescription: 'A test PR',
  prLabels: 'bug, enhancements',
  filesChanged: 2,
  totalLoc: 50,
  reviewDepth: 'standard',
  changedAreas: 'src/utils',
  reviewCount: 0,
  resolvedCount: 0,
  changesRequested: 0,
  previousReviews: '',
  commitMessages: 'feat: add feature',
  hasTestChanges: true,
  missingTests: false,
}

describe('buildReviewPrompt', () => {
  it('should include CI/CD check results when provided', () => {
    const contextWithChecks = {
      ...mockContext,
      checkResults: '✅ Build: success\n❌ Lint: failure',
    }

    const prompt = buildReviewPrompt('diff content', contextWithChecks, 'context content')

    expect(prompt).toContain('## CI/CD Check Results')
    expect(prompt).toContain('✅ Build: success')
    expect(prompt).toContain('❌ Lint: failure')
  })

  it('should not include CI/CD check results when undefined', () => {
    const contextWithoutChecks = {
      ...mockContext,
      checkResults: undefined,
    }

    const prompt = buildReviewPrompt('diff content', contextWithoutChecks, 'context content')

    expect(prompt).not.toContain('## CI/CD Check Results')
  })
})
