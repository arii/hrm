import { readFile, stat } from 'fs/promises';

export interface ConflictBlock {
  id: string; // generated ID for tracking
  file: string;
  startLine: number;
  endLine: number;
  currentLabel: string;
  incomingLabel: string;
  currentContent: string;
  incomingContent: string;
  contextBefore: string;
  contextAfter: string;
}

/**
 * Regex to match Git conflict markers.
 * Captures:
 * 1. Current Label (e.g., HEAD)
 * 2. Current Content
 * 3. (Optional) Common Ancestor Content (ignored)
 * 4. Incoming Content
 * 5. Incoming Label (e.g., branch-name)
 */
const CONFLICT_REGEX = /^<<<<<<< (.*?)\n([\s\S]*?)(?:^\|\|\|\|\|\|\| .*?\n[\s\S]*?)?^=======\n([\s\S]*?)^>>>>>>> (.*?)$/gm;

export async function parseConflicts(filePath: string): Promise<ConflictBlock[]> {
  try {
    // Security: Check file size to prevent OOM/ReDoS on excessively large files.
    const stats = await stat(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 1) { // 1 MB limit
      console.warn(`Skipping large file: ${filePath} (${fileSizeInMB.toFixed(2)} MB)`);
      return [];
    }
  } catch (error) {
    console.error(`Failed to stat file, skipping: ${filePath}`);
    return [];
  }

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file for conflict parsing: ${filePath}`);
    return [];
  }

  const conflicts: ConflictBlock[] = [];
  const lines = content.split('\n');

  // Reset lastIndex because we're using the global flag
  CONFLICT_REGEX.lastIndex = 0;

  let match;
  while ((match = CONFLICT_REGEX.exec(content)) !== null) {
    // Add nullish coalescing fallbacks to satisfy TypeScript's type checker,
    // which correctly identifies that regex capture groups can be undefined.
    const [fullMatch, currentLabel, currentContent, incomingContent, incomingLabel] = match;

    // Calculate line numbers
    const matchIndex = match.index;
    const preMatchLines = content.substring(0, matchIndex).split('\n');
    const startLine = preMatchLines.length;
    const endLine = startLine + (fullMatch ?? '').split('\n').length - 1;

    // Get Context (5 lines before and after)
    const contextBefore = lines.slice(Math.max(0, startLine - 6), startLine - 1).join('\n');
    const contextAfter = lines.slice(endLine, Math.min(lines.length, endLine + 5)).join('\n');

    conflicts.push({
      id: `conflict-${filePath}-${startLine}`,
      file: filePath,
      startLine,
      endLine,
      currentLabel: (currentLabel ?? '').trim(),
      incomingLabel: (incomingLabel ?? '').trim(),
      currentContent: currentContent ?? '', // Keep newlines for accurate reconstruction
      incomingContent: incomingContent ?? '',
      contextBefore,
      contextAfter
    });
  }

  return conflicts;
}
