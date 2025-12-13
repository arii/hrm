// File: tests/unit/services/geminiService.test.ts
import { generateReleaseNotes, enrichPrDescription, suggestStrategicIssues } from '../../../services/geminiService';
import { GithubPullRequest, GithubIssue } from '../../../types';
import * as GoogleAI from '@google/genai';

// Set a dummy API key for the test environment
process.env.API_KEY = 'test-api-key';

jest.mock('@google/genai');

describe('Gemini Service', () => {
  beforeEach(() => {
    // Clear mocks before each test
    ((GoogleAI as any).GoogleGenerativeAI as jest.Mock).mockClear();
    (GoogleAI as any).mockGetGenerativeModel.mockClear();
    (GoogleAI as any).mockGenerateContent.mockClear();
  });

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

      (GoogleAI as any).mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      });

      const result = await generateReleaseNotes(mockPrs, 'v1.0.0');

      expect(result).toEqual(mockResponse);
      expect((GoogleAI as any).mockGetGenerativeModel).toHaveBeenCalledWith({
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
      expect((GoogleAI as any).mockGetGenerativeModel).not.toHaveBeenCalled();
    });
  });

  describe('enrichPrDescription', () => {
    it('should enrich a PR description', async () => {
      const mockPr: GithubPullRequest = {
        number: 1,
        title: 'added new feature',
        user: { login: 'testuser' },
        body: 'this is a new feature',
      };

      const mockResponse = {
        title: 'feat: Add new feature',
        body: '### Why\n\n...\n\n### What\n\n...\n\n### How\n\n...\n\n### Testing\n\n...',
        analysis: 'The original title was not in the imperative mood and the body was missing the standard sections.',
      };

      (GoogleAI as any).mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      });

      const result = await enrichPrDescription(mockPr);

      expect(result).toEqual(mockResponse);
      expect((GoogleAI as any).mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
        },
        responseSchema: expect.any(Object),
      });
    });
  });

  describe('suggestStrategicIssues', () => {
    it('should suggest strategic issues', async () => {
      const mockIssues: GithubIssue[] = [];
      const mockPrs: GithubPullRequest[] = [];

      const mockResponse = [
        {
          title: 'refactor: Improve documentation',
          body: 'The documentation is lacking in several areas...',
          reason: 'The documentation is incomplete.',
          priority: 'Medium',
          effort: 'Medium',
          labels: ['documentation', 'enhancement'],
        },
      ];

      (GoogleAI as any).mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      });

      const result = await suggestStrategicIssues(mockIssues, mockPrs, 'strategic');

      expect(result).toEqual(mockResponse);
      expect((GoogleAI as any).mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
        },
        responseSchema: expect.any(Object),
      });
    });
  });
});
