// File: tests/unit/services/geminiService.test.ts
import {
  generateReleaseNotes,
  enrichPrDescription,
  suggestStrategicIssues,
} from '../../../services/geminiService'
import { GithubPullRequest, GithubIssue } from '../../../types'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Set a dummy API key for the test environment
process.env.GEMINI_API_KEY = 'test-api-key'

// --- Mocking the @google/generative-ai library ---
// 1. Define the mock implementations for the methods we'll use.
const mockGenerateContent = jest.fn()
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}))

// 2. Mock the entire module.
// The factory function passed to jest.mock is hoisted, so it runs before other code.
// We use mockImplementation here to avoid the "cannot access before initialization" error.
jest.mock('@google/generative-ai', () => ({
  __esModule: true,
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  // The service uses the 'Type' enum for defining response schemas, so we must mock it here.
  Type: {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    INTEGER: 'INTEGER',
  },
}))

// 3. Create a typed reference to the mocked constructor for convenience.
const MockedGoogleGenerativeAI = GoogleGenerativeAI as jest.Mock
// --- End Mocking ---

describe('Gemini Service', () => {
  beforeEach(() => {
    // Clear mocks before each test to ensure test isolation
    MockedGoogleGenerativeAI.mockClear()
    mockGetGenerativeModel.mockClear()
    mockGenerateContent.mockClear()
  })

  describe('generateReleaseNotes', () => {
    it('should generate release notes from a list of PRs', async () => {
      const mockPrs = [
        {
          number: 1,
          title: 'feat: Add new feature',
          user: { login: 'testuser' },
          merged_at: '2024-01-01T00:00:00Z',
          body: 'This is a new feature.',
        },
      ] as GithubPullRequest[]

      const mockResponse = {
        version: 'v1.0.0',
        markdown:
          '## Release Notes v1.0.0\n\n### Features\n- Add new feature (#1)',
        categories: {
          features: ['Add new feature (#1)'],
          fixes: [],
          chores: [],
        },
      }

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      })

      const result = await generateReleaseNotes(mockPrs, 'v1.0.0')

      expect(result).toEqual(mockResponse)
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
        })
      )
    })

    it('should handle no PRs', async () => {
      const result = await generateReleaseNotes([], 'v1.0.0')
      expect(result).toEqual({
        version: 'v1.0.0',
        markdown: 'No merged PRs to report.',
        categories: {
          features: [],
          fixes: [],
          chores: [],
        },
      })
      expect(mockGetGenerativeModel).not.toHaveBeenCalled()
    })
  })

  describe('enrichPrDescription', () => {
    it('should enrich a PR description', async () => {
      const mockPr = {
        number: 1,
        title: 'added new feature',
        user: { login: 'testuser' },
        body: 'this is a new feature',
      } as GithubPullRequest

      const mockResponse = {
        title: 'feat: Add new feature',
        body: '### Why\n\n...\n\n### What\n\n...\n\n### How\n\n...\n\n### Testing\n\n...',
        analysis:
          'The original title was not in the imperative mood and the body was missing the standard sections.',
      }

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      })

      const result = await enrichPrDescription(mockPr)

      expect(result).toEqual(mockResponse)
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
        })
      )
    })
  })

  describe('suggestStrategicIssues', () => {
    it('should suggest strategic issues', async () => {
      const mockIssues: GithubIssue[] = []
      const mockPrs: GithubPullRequest[] = []

      const mockResponse = [
        {
          title: 'refactor: Improve documentation',
          body: 'The documentation is lacking in several areas...',
          reason: 'The documentation is incomplete.',
          priority: 'Medium',
          effort: 'Medium',
          labels: ['documentation', 'enhancement'],
        },
      ]

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      })

      const result = await suggestStrategicIssues(
        mockIssues,
        mockPrs,
        'strategic'
      )

      expect(result).toEqual(mockResponse)
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
        })
      )
    })
  })
})
