// File: tests/unit/services/geminiService.test.ts
import { generateReleaseNotes } from '../../../services/geminiService';
import { GithubPullRequest } from '../../../types';
import { mockGetGenerativeModel, mockGenerateContent } from '@google/genai';

// Set a dummy API key for the test environment
process.env.API_KEY = 'test-api-key';

jest.mock('@google/genai');

describe('Gemini Service', () => {
  describe('generateReleaseNotes', () => {
    it('should generate release notes from a list of PRs', async () => {
      const mockPrs: GithubPullRequest[] = [
        {
          number: 1,
          title: 'feat: Add new feature',
          user: { login: 'testuser' },
          merged_at: '2024-01-01T00:00:00Z',
          body: 'This is a new feature.',
        },
      ];

      const mockResponse = {
        version: 'v1.0.0',
        markdown: '## Release Notes v1.0.0\n\n### Features\n- Add new feature (#1)',
        categories: {
          features: ['Add new feature (#1)'],
          fixes: [],
          chores: [],
        },
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      });

      const result = await generateReleaseNotes(mockPrs, 'v1.0.0');

      expect(result).toEqual(mockResponse);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
        responseSchema: expect.any(Object),
      });
    });

    it('should handle no PRs', async () => {
      const result = await generateReleaseNotes([], 'v1.0.0');
      expect(result).toEqual({
        version: 'v1.0.0',
        markdown: 'No merged PRs to report.',
        categories: {
          features: [],
          fixes: [],
          chores: [],
        },
      });
      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
    });
  });
});
