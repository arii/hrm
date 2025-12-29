
import { buildReviewPrompt } from '../../../scripts/gemini-client';
import type { ReviewContext, FailedCheck } from '../../../scripts/gemini-client';

describe('buildReviewPrompt', () => {
  const mockContextBase: ReviewContext = {
    prNumber: '123',
    prTitle: 'Test PR',
    prAuthor: 'test-author',
    prDescription: 'This is a test PR.',
    prLabels: '',
    filesChanged: 2,
    totalLoc: 100,
    reviewDepth: 'standard',
    changedAreas: 'scripts, tests',
    reviewCount: 0,
    resolvedCount: 0,
    changesRequested: 0,
    previousReviews: '',
    commitMessages: 'feat: add new feature',
    hasTestChanges: true,
    missingTests: false,
    testFiles: 'tests/unit/scripts/gemini-client.test.ts',
    failedChecks: [],
  };

  it('should generate a standard review prompt when there are no CI failures', () => {
    const prompt = buildReviewPrompt('fake-diff', mockContextBase, 'fake-docs');
    expect(prompt).toContain('## Review Instructions');
    expect(prompt).not.toContain('🚨 IMMEDIATE ACTION REQUIRED: CI/CD PIPELINE FAILURE');
    expect(prompt).not.toContain('You are now in **DEBUG MODE**');
  });

  it('should include the requirement compliance section when a linked issue is present', () => {
    const contextWithIssue: ReviewContext = {
      ...mockContextBase,
      issueNumber: '456',
      issueTitle: 'Test Issue',
      linkedIssueBody: 'This is the body of the linked issue.',
    };
    const prompt = buildReviewPrompt('fake-diff', contextWithIssue, 'fake-docs');
    expect(prompt).toContain('## Linked Issue Requirements');
    expect(prompt).toContain("The user is trying to solve issue #456");
    expect(prompt).toContain("you MUST explicitly verify if these requirements are met");
  });

  it('should generate a "Fix Mode" prompt when there are CI failures', () => {
    const contextWithFailures: ReviewContext = {
      ...mockContextBase,
      failedChecks: [
        { name: 'test:unit', conclusion: 'failure', detailsUrl: 'http://example.com' },
      ],
    };
    const prompt = buildReviewPrompt('fake-diff', contextWithFailures, 'fake-docs');
    expect(prompt).toContain('🚨 IMMEDIATE ACTION REQUIRED: CI/CD PIPELINE FAILURE');
    expect(prompt).toContain('You are now in **DEBUG MODE**');
    expect(prompt).toContain('- **test:unit** (failure) - [View Log](http://example.com)');
    expect(prompt).not.toContain('## Review Instructions');
  });

  it('should use the GEMINI_MAX_DIFF_LENGTH environment variable for truncation', () => {
    process.env.GEMINI_MAX_DIFF_LENGTH = '10';
    const longDiff = 'a'.repeat(20);
    const prompt = buildReviewPrompt(longDiff, mockContextBase, 'fake-docs');
    expect(prompt).toContain('...[DIFF TRUNCATED]');
    delete process.env.GEMINI_MAX_DIFF_LENGTH;
  });

  it('should include the log snippet in the "Fix Mode" prompt when available', () => {
    const contextWithLogSnippet: ReviewContext = {
      ...mockContextBase,
      failedChecks: [
        {
          name: 'build',
          conclusion: 'failure',
          detailsUrl: 'http://example.com',
          logSnippet: 'Error: Type `any` not allowed.',
        },
      ],
    };
    const prompt = buildReviewPrompt('fake-diff', contextWithLogSnippet, 'fake-docs');
    expect(prompt).toContain('**Error Snippet:**');
    expect(prompt).toContain('Error: Type `any` not allowed.');
  });
});
