import { readFile, stat } from 'fs/promises'

export interface ConflictBlock {
  id: string // generated ID for tracking
  file: string
  startLine: number
  endLine: number
  currentLabel: string
  incomingLabel: string
  currentContent: string
  incomingContent: string
  contextBefore: string
  contextAfter: string
}

/**
 * Regex to match Git conflict markers.
 * Captures:
 * 1. Current Label (e.g., HEAD)
 * 2. Current Content
 * 3. (Optional) Common Ancestor Content (ignored)
 * 4. Incoming Content
 * 5. Incoming Label (e.g., branch-name)
 *
 * @note This regex is designed to be robust for common cases but may have limitations
 * with highly unusual or malformed conflict markers. It is an area to monitor for
 * potential edge-case failures in real-world usage.
 */
const CONFLICT_REGEX =
  /^<<<<<<< (.*?)\n([\s\S]*?)(?:^\|\|\|\|\|\|\| .*?\n[\s\S]*?)?^=======\n([\s\S]*?)^>>>>>>> (.*?)$/gm

export async function parseConflicts(
  filePath: string
): Promise<ConflictBlock[]> {
  try {
    // Security: Check file size to prevent OOM/ReDoS on excessively large files.
    const stats = await stat(filePath)
    const fileSizeInMB = stats.size / (1024 * 1024)
    if (fileSizeInMB > 1) {
      // 1 MB limit
        `Skipping large file: ${filePath} (${fileSizeInMB.toFixed(2)} MB)`
      )
      return []
    }
  } catch (error) {
    return []
  }

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch (error) {
    return []
  }

  const conflicts: ConflictBlock[] = []
  const lines = content.split('\n')

  // Reset lastIndex because we're using the global flag
  CONFLICT_REGEX.lastIndex = 0

  let match
  let lastIndex = 0
  let currentLine = 1
  while ((match = CONFLICT_REGEX.exec(content)) !== null) {
    // Add nullish coalescing fallbacks to satisfy TypeScript's type checker,
    // which correctly identifies that regex capture groups can be undefined.
    const [
      fullMatch,
      currentLabel,
      currentContent,
      incomingContent,
      incomingLabel,
    ] = match

    // Calculate line numbers efficiently using an accumulator
    const matchIndex = match.index
    const newlines = (
      content.substring(lastIndex, matchIndex).match(/\n/g) || []
    ).length
    currentLine += newlines
    const startLine = currentLine
    const endLine = startLine + (fullMatch ?? '').split('\n').length - 1

    // Get Context (5 lines before and after)
    const contextBefore = lines
      .slice(Math.max(0, startLine - 6), startLine - 1)
      .join('\n')
    const contextAfter = lines
      .slice(endLine, Math.min(lines.length, endLine + 5))
      .join('\n')

    lastIndex = matchIndex + (fullMatch ?? '').length
    currentLine = endLine

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
      contextAfter,
    })
  }

  return conflicts
}
