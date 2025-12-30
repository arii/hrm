import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseConflicts } from '@/scripts/utils/git-conflicts';
import { readFile, writeFile } from 'fs/promises';
import { mocked } from 'jest-mock';
import path from 'path';

jest.mock('@google/generative-ai');
jest.mock('@/scripts/utils/git-conflicts');
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

const mockedParseConflicts = mocked(parseConflicts);
const mockedGenerateContent = jest.fn();
const mockedGoogleGenerativeAI = mocked(GoogleGenerativeAI);
const mockedReadFile = mocked(readFile);
const mockedWriteFile = mocked(writeFile);

describe('runConflictResolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockedGenerateContent,
      }),
    }));
  });

  it('should generate a report for valid conflicts', async () => {
    const { runConflictResolution } = await import('@/scripts/gemini-client');
    mockedReadFile.mockResolvedValue('file1.ts\nfile2.ts');
    mockedParseConflicts.mockResolvedValueOnce([
      { id: 'conflict-1', file: 'file1.ts', startLine: 1, endLine: 3, currentLabel: 'HEAD', incomingLabel: 'branch-a', currentContent: 'a', incomingContent: 'b', contextBefore: '', contextAfter: '' },
    ]).mockResolvedValueOnce([
      { id: 'conflict-2', file: 'file2.ts', startLine: 10, endLine: 12, currentLabel: 'HEAD', incomingLabel: 'branch-a', currentContent: 'c', incomingContent: 'd', contextBefore: '', contextAfter: '' },
    ]);
    mockedGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          { id: 'conflict-1', resolution: 'ab' },
          { id: 'conflict-2', resolution: 'cd' },
        ]),
      },
    });

    await runConflictResolution(new GoogleGenerativeAI(''), 'conflicts.txt', 'report.md');

    expect(mockedWriteFile).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'report.md'),
      expect.stringContaining('### 📂 `file1.ts` (Lines 1-3)')
    );
    expect(mockedWriteFile).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'report.md'),
      expect.stringContaining('### 📂 `file2.ts` (Lines 10-12)')
    );
  });

  it('should handle malformed AI response', async () => {
    const { runConflictResolution } = await import('@/scripts/gemini-client');
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as (code?: number) => never);
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockedReadFile.mockResolvedValue('file1.ts');
    mockedParseConflicts.mockResolvedValue([
      { id: 'conflict-1', file: 'file1.ts', startLine: 1, endLine: 3, currentLabel: 'HEAD', incomingLabel: 'branch-a', currentContent: 'a', incomingContent: 'b', contextBefore: '', contextAfter: '' },
    ]);
    mockedGenerateContent.mockResolvedValue({
      response: {
        text: () => 'not a json',
      },
    });

    await runConflictResolution(new GoogleGenerativeAI(''), 'conflicts.txt', null);

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error during content generation:',
      expect.stringContaining('Failed to parse AI resolution JSON')
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });
});
