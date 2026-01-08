/**
 * @jest-environment node
 */
import { writeFile, readFile } from 'fs/promises';
import {
  isTechDebtResponse,
  main,
} from '../../../scripts/identify-tech-debt';
import * as geminiClient from '../../../scripts/gemini-client';

// Mock dependencies
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('../../../scripts/gemini-client', () => ({
  generateContentWithFallback: jest.fn(),
  cleanJsonOutput: jest.fn((text) => text),
  JsonProcessor: jest.fn(() => ({
    process: jest.fn(),
  })),
}));

describe('identify-tech-debt', () => {
  let mockExit: jest.SpyInstance;
  let mockStderr: jest.SpyInstance;
  let mockStdout: jest.SpyInstance;
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as (code?: number) => never);
    mockStderr = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStdout = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalArgv = process.argv;
    originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = 'test-api-key';
    // All tests read the prompt file
    (readFile as jest.Mock).mockResolvedValue('prompt template {{code}}');
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('isTechDebtResponse', () => {
    it('should return true for valid tech debt response', () => {
      const data = {
        issues: [
          {
            title: 'Test Issue',
            description: 'A test description.',
            fingerprint: 'test-fingerprint',
          },
        ],
      };
      expect(isTechDebtResponse(data)).toBe(true);
    });

    it('should return false for missing issues array', () => {
      const data = { notissues: [] };
      expect(isTechDebtResponse(data)).toBe(false);
    });

    it('should return false for invalid issue object', () => {
      const data = {
        issues: [{ title: 'Only title' }],
      };
      expect(isTechDebtResponse(data)).toBe(false);
    });
  });

  describe('main', () => {
    it('should show usage and exit if --output is missing', async () => {
      process.argv = ['node', 'script.ts', '--files', 'file1.ts'];
      await main();
      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should show usage and exit if --files are missing', async () => {
      process.argv = ['node', 'script.ts', '--output', 'out.json'];
      await main();
      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit if GEMINI_API_KEY is not set', async () => {
        delete process.env.GEMINI_API_KEY;
        process.argv = ['node', 'script.ts', '--output', 'out.json', '--files', 'file1.ts'];
        await main();
        expect(mockStderr).toHaveBeenCalledWith("An unexpected error occurred during the analysis process:", expect.any(Error));
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should process files and write aggregated issues', async () => {
      process.argv = [
        'node',
        'script.ts',
        '--output',
        'out.json',
        '--files',
        'file1.ts',
        'file2.ts',
      ];

      (readFile as jest.Mock)
        // prompt template
        .mockResolvedValueOnce('template')
        .mockResolvedValueOnce('const a = 1;')
        .mockResolvedValueOnce('const b = 2;');

      const mockApiResponse1 = { issues: [{ title: 'Issue 1', description: 'Desc 1', fingerprint: 'fp1' }] };
      const mockApiResponse2 = { issues: [{ title: 'Issue 2', description: 'Desc 2', fingerprint: 'fp2' }] };

      const mockJsonProcessor = {
        process: jest.fn()
          .mockReturnValueOnce({ success: true, data: mockApiResponse1 })
          .mockReturnValueOnce({ success: true, data: mockApiResponse2 }),
      };
      (geminiClient.JsonProcessor as jest.Mock).mockReturnValue(mockJsonProcessor);
      (geminiClient.generateContentWithFallback as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockApiResponse1))
        .mockResolvedValueOnce(JSON.stringify(mockApiResponse2));

      await main();

      expect(readFile).toHaveBeenCalledTimes(3); // 1 for prompt, 2 for files
      expect(geminiClient.generateContentWithFallback).toHaveBeenCalledTimes(2);
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ issues: [...mockApiResponse1.issues, ...mockApiResponse2.issues] }, null, 2)
      );
      expect(mockStdout).toHaveBeenCalledWith(expect.stringContaining('Technical debt analysis complete.'));
    });

    it('should handle file read errors gracefully', async () => {
        process.argv = ['node', 'script.ts', '--output', 'out.json', '--files', 'bad.ts', 'good.ts'];
        (readFile as jest.Mock)
            .mockResolvedValueOnce('template') // prompt
            .mockRejectedValueOnce(new Error('File not found'))
            .mockResolvedValueOnce('const a = 1;');

        const mockApiResponse = { issues: [{ title: 'Issue 1', description: 'Desc 1', fingerprint: 'fp1' }] };
        const mockJsonProcessor = {
            process: jest.fn().mockReturnValue({ success: true, data: mockApiResponse }),
        };
        (geminiClient.JsonProcessor as jest.Mock).mockReturnValue(mockJsonProcessor);
        (geminiClient.generateContentWithFallback as jest.Mock).mockResolvedValue(JSON.stringify(mockApiResponse));

        await main();

        expect(mockStderr).toHaveBeenCalledWith('Error processing file bad.ts:', expect.any(Error));
        expect(writeFile).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify({ issues: mockApiResponse.issues }, null, 2)
        );
    });

    it('should handle invalid JSON from API gracefully', async () => {
        process.argv = ['node', 'script.ts', '--output', 'out.json', '--files', 'file1.ts'];
        (readFile as jest.Mock)
          .mockResolvedValueOnce('template') // prompt
          .mockResolvedValueOnce('const a = 1;');

        const mockJsonProcessor = {
            process: jest.fn().mockReturnValue({ success: false, data: { error: 'bad json' } }),
        };
        (geminiClient.JsonProcessor as jest.Mock).mockReturnValue(mockJsonProcessor);
        (geminiClient.generateContentWithFallback as jest.Mock).mockResolvedValue('{ not_json: "true" }');

        const mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        await main();

        expect(mockWarn).toHaveBeenCalledWith('Warning: Failed to parse valid technical debt JSON for file1.ts.');
        expect(writeFile).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify({ issues: [] }, null, 2)
        );
        mockWarn.mockRestore();
    });
  });
});
