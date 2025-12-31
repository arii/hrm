import {
  parseSpecializedRules,
  getSpecializedRules,
  getChangedFilesFromDiff,
} from '../../../../scripts/utils/rules';
import { readFile } from 'fs/promises';

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Type cast the mock for easier use
const mockedReadFile = readFile as jest.Mock;

describe('Specialized Rules', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChangedFilesFromDiff', () => {
    it('should extract changed files from a standard git diff', () => {
      const diff = `
diff --git a/file1.txt b/file1.txt
index e69de29..d00491f 100644
--- a/file1.txt
+++ b/file1.txt
@@ -0,0 +1 @@
+hello
diff --git a/src/component.tsx b/src/component.tsx
index 8b13789..9e6a2c1 100644
--- a/src/component.tsx
+++ b/src/component.tsx
@@ -1,1 +1,1 @@
-<div>old</div>
+<div>new</div>
`;
      const expected = ['file1.txt', 'src/component.tsx'];
      expect(getChangedFilesFromDiff(diff).sort()).toEqual(expected.sort());
    });

    it('should return an empty array for an empty diff string', () => {
      expect(getChangedFilesFromDiff('')).toEqual([]);
    });

    it('should handle file paths with spaces', () => {
      const diff = 'diff --git "a/path with spaces/file.js" "b/path with spaces/file.js"';
      expect(getChangedFilesFromDiff(diff)).toEqual(['path with spaces/file.js']);
    });
  });

  describe('parseSpecializedRules', () => {
    it('should parse rules from commented lines', () => {
      const content = `
# rule: require-tests
# level: high
# description: All new features must have tests.
const x = 1;
`;
      const expected = [
        { key: 'rule', value: 'require-tests' },
        { key: 'level', value: 'high' },
        { key: 'description', value: 'All new features must have tests.' },
      ];
      expect(parseSpecializedRules(content)).toEqual(expected);
    });

    it('should return an empty array for content with no rule comments', () => {
      const content = 'const y = 2;';
      expect(parseSpecializedRules(content)).toEqual([]);
    });

    it('should ignore lines that are not valid key-value pairs', () => {
      const content = `
# rule: valid
# not a rule
# another-rule: also valid
`;
      const expected = [
        { key: 'rule', value: 'valid' },
        { key: 'another-rule', value: 'also valid' },
      ];
      expect(parseSpecializedRules(content)).toEqual(expected);
    });
  });

  describe('getSpecializedRules', () => {
    it('should read a file and return a rule object', async () => {
      const filePath = 'a/file/with/rules.md';
      const fileContent = `
# max-length: 80
# min-length: 10
`;
      mockedReadFile.mockResolvedValue(fileContent);
      const expected = {
        'max-length': '80',
        'min-length': '10',
      };
      await expect(getSpecializedRules(filePath)).resolves.toEqual(expected);
      expect(readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should return an empty object if the file contains no rules', async () => {
      const filePath = 'a/file/without/rules.txt';
      mockedReadFile.mockResolvedValue('Some content');
      await expect(getSpecializedRules(filePath)).resolves.toEqual({});
    });

    it('should propagate errors from readFile', async () => {
      const filePath = 'nonexistent/file.txt';
      const error = new Error('File not found');
      mockedReadFile.mockRejectedValue(error);
      await expect(getSpecializedRules(filePath)).rejects.toThrow('File not found');
    });
  });
});
