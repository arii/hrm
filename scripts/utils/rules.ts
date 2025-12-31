import { readFile } from 'fs/promises';

export function getChangedFilesFromDiff(diff: string): string[] {
  const files: string[] = [];
  const lines = diff.split('\n');
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const pathLine = line.substring('diff --git '.length);
      let filePathA;
      if (pathLine.startsWith('"')) {
        const endIndex = pathLine.indexOf('"', 1);
        filePathA = pathLine.substring(1, endIndex);
      } else {
        filePathA = pathLine.split(' ')[0];
      }

      if (filePathA && filePathA.startsWith('a/')) {
        files.push(filePathA.substring(2));
      }
    }
  }
  return files;
}

export function parseSpecializedRules(content: string): { key: string; value: string }[] {
  const rules: { key: string; value: string }[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('#')) {
      const trimmedLine = line.substring(1).trim();
      const parts = trimmedLine.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key && value) {
          rules.push({ key, value });
        }
      }
    }
  }
  return rules;
}

export async function getSpecializedRules(filePath: string): Promise<Record<string, string>> {
  const content = await readFile(filePath, 'utf-8');
  const rules = parseSpecializedRules(content);
  const rulesObject: Record<string, string> = {};
  for (const rule of rules) {
    rulesObject[rule.key] = rule.value;
  }
  return rulesObject;
}
