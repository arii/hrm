import path from 'path'
import fs from 'fs'
import {
  generateContentWithFallback,
  JsonProcessor,
  handleError,
  writeOutput,
  cleanJsonOutput,
} from './gemini-client'
import { parseConflicts } from './utils/git-conflicts'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * The expected JSON structure of a single resolution from the AI model.
 */
export interface Resolution {
  filePath: string
  resolvedContent: string
  explanation: string
}

/**
 * Type guard to check if an object is a valid array of Resolution objects.
 * This is crucial for ensuring the AI's output conforms to the expected structure
 * before attempting to process it.
 * @param obj The object to check.
 * @returns True if the object is a valid Resolution[], false otherwise.
 */
export function isResolutionArray(obj: unknown): obj is Resolution[] {
  if (!Array.isArray(obj)) {
    return false
  }

  // Allow empty array
  if (obj.length === 0) {
    return true
  }

  // Check if every item in the array has the required properties and types
  return obj.every((item) => {
    return (
      typeof item === 'object' &&
      item !== null &&
      'filePath' in item &&
      typeof item.filePath === 'string' &&
      'resolvedContent' in item &&
      typeof item.resolvedContent === 'string' &&
      'explanation' in item &&
      typeof item.explanation === 'string'
    )
  })
}

export async function runConflictResolution(
  genAI: GoogleGenerativeAI,
  conflictFile: string,
  outputFile: string | null | undefined,
  agentDetailsFile: string
) {
  let agentDetails = ''
  try {
    agentDetails = await fs.promises.readFile(agentDetailsFile, 'utf-8')
  } catch (e) {
    await handleError(
      new Error(`Failed to read agent details file: ${(e as Error).message}`)
    )
    return // Exit if we can't get agent details
  }

  const conflictsContent = await fs.promises.readFile(conflictFile, 'utf-8')
  const files = conflictsContent.split('\n').filter((f) => f.trim() !== '')

  if (files.length === 0) {
    console.log('No conflict files to process.')
    await writeOutput(
      JSON.stringify({ resolutions: [], summary: 'No conflicts found.' }),
      outputFile
    )
    return
  }

  const resolutions: Resolution[] = []
  const prCodeRoot = path.resolve(process.cwd(), 'pr-code')

  for (const file of files) {
    const trimmedFile = path.normalize(path.join('pr-code', file.trim()))
    const absolutePath = path.resolve(process.cwd(), trimmedFile)

    let realPath: string
    try {
      realPath = fs.realpathSync(absolutePath)
    } catch (err) {
      console.warn(`Skipping unresolvable file or broken symlink: ${file}`)
      continue // Skip files that cannot be resolved or are broken symlinks
    }

    if (!realPath.startsWith(prCodeRoot)) {
      console.warn(`Skipping potential path traversal (symlink detected): ${file}`)
      continue
    }

    try {
      const fileConflicts = await parseConflicts(realPath)
      if (!fileConflicts) {
        console.log(`No conflict markers found in ${file}, skipping.`)
        continue
      }

      const prompt = `
${agentDetails}

### Conflicts to Resolve:
\`\`\`
${fileConflicts}
\`\`\`
`

      const text = await generateContentWithFallback(genAI, prompt)
      const cleanedText = cleanJsonOutput(text || '')
      let json
      try {
        json = JSON.parse(cleanedText)
      } catch (e) {
        throw new Error(
          `Failed to parse AI resolution JSON. Raw response:\n${cleanedText}`
        )
      }


      if (isResolutionArray(json)) {
        resolutions.push(...json)
      } else {
        throw new Error('AI response is not a valid Resolution array.')
      }
    } catch (error) {
      await handleError(error)
    }
  }

  const summary = `Resolved ${resolutions.length} conflict(s) in ${files.length} file(s).`
  const finalOutput = { resolutions, summary }

  await writeOutput(JSON.stringify(finalOutput, null, 2), outputFile)
}
