import { promises as fs } from 'fs'
import path from 'path'

/**
 * Parses a file for Git conflict markers and extracts the conflicting blocks.
 * @param filePath The path to the file to parse.
 * @returns A string containing the formatted conflict blocks, or null if no conflicts are found.
 */
export async function parseConflicts(filePath: string): Promise<string | null> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  const conflictRegex = /^(<<<<<<<|=======|>>>>>>>)/
  let inConflict = false
  let conflictBlocks = ''
  let blockNumber = 0

  for (let i = 0; i < lines.length; i++) {
    if (conflictRegex.test(lines[i])) {
      if (!inConflict) {
        inConflict = true
        blockNumber++
        const start = Math.max(0, i - 3)
        conflictBlocks += `--- Conflict Block ${blockNumber} in ${path.basename(
        filePath
      )} ---\n`
        conflictBlocks += lines.slice(start, i).join('\n') + '\n'
      }
      conflictBlocks += lines[i] + '\n'
    } else if (inConflict) {
      conflictBlocks += lines[i] + '\n'
      if (lines[i].startsWith('>>>>>>>')) {
        inConflict = false
        const end = Math.min(lines.length, i + 4)
        conflictBlocks += lines.slice(i + 1, end).join('\n') + '\n\n'
      }
    }
  }

  return conflictBlocks || null
}
