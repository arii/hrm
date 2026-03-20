import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseConflicts } from './utils/git-conflicts'
import {
  generateContentWithFallback,
  JsonProcessor,
  writeOutput,
} from './gemini-client'

interface Resolution {
  id: string
  resolution: string
}

function isResolutionArray(data: unknown): data is Resolution[] {
  if (!Array.isArray(data)) {
    return false
  }
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      typeof item.id === 'string' &&
      'resolution' in item &&
      typeof item.resolution === 'string'
  )
}

export async function runConflictResolution(
  genAI: GoogleGenerativeAI,
  contextFile: string,
  outputFile: string | null | undefined
) {
  const conflictFilePaths = await readFile(contextFile, 'utf-8').then(
    (content) => content.split('\0')
  )
  let report = `# 🤖 Conflict Resolution Plan\n\n`
  const unprocessedFiles: { file: string; error: string }[] = []
  let totalConflicts = 0
  const prCodeRoot = path.resolve(process.cwd(), 'pr-code')

  for (const file of conflictFilePaths) {
    if (!file.trim()) continue

    const trimmedFile = path.join('pr-code', file.trim())
    const absolutePath = path.resolve(process.cwd(), trimmedFile)
    const relativePath = path.relative(prCodeRoot, absolutePath)

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      console.warn(`Skipping potential path traversal: ${file}`)
      continue
    }

    let fileConflicts
    try {
      fileConflicts = await parseConflicts(trimmedFile)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      unprocessedFiles.push({ file: trimmedFile, error: errorMessage })
      continue
    }
    totalConflicts += fileConflicts.length

    if (fileConflicts.length === 0) {
      continue
    }

    const prompt = `
You are an Expert Git Conflict Resolver for a TypeScript/Next.js application.
Your task is to resolve the following merge conflicts intelligently for the file \`${trimmedFile}\`.

### Instructions:
1. **Analyze Semantics**: Understand what "HEAD" (Current) and the "Incoming" branch were trying to achieve.
2. **Preserve Both**: If both sides added valid, non-conflicting code (e.g., different imports, different map keys), KEEP BOTH.
3. **Select Best**: If logic directly contradicts, choose the more modern implementation (usually Incoming if it's a refactor).
4. **Output Format**: Return a JSON array where each object contains the \`id\` of the conflict and the \`resolution\` string (the code to replace the conflict block with).

### Conflicts to Resolve:
${JSON.stringify(fileConflicts, null, 2)}

### Response Format (JSON Only):
\`\`\`json
[
  {
    "id": "conflict-src/file.ts-10",
    "resolution": "import { A } from 'a';\\nimport { B } from 'b';"
  }
]
\`\`\`
`

    try {
      const { text } = await generateContentWithFallback({
        genAI,
        prompt,
        config: {
          generationConfig: { responseMimeType: 'application/json' },
        },
      })

      // Process the JSON output
      const jsonProcessor = new JsonProcessor()
      const result = jsonProcessor.process(text)

      if (result.success && isResolutionArray(result.data)) {
        for (const res of result.data) {
          const original = fileConflicts.find((c) => c.id === res.id)
          if (!original) continue

          report += `### 📂 \`${original.file}\` (Lines ${original.startLine}-${original.endLine})\n`
          report += `**Resolution:**\n\`\`\`typescript\n${res.resolution}\n\`\`\`\n\n`
          report += `--- \n`
        }
      } else {
        throw new Error('Failed to parse AI resolution JSON')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown AI error'
      unprocessedFiles.push({ file: trimmedFile, error: errorMessage })
    }
  }

  if (unprocessedFiles.length > 0) {
    report += `---
### ⚠️ Unprocessed Files
The following files could not be processed due to errors:
${unprocessedFiles
  .map((f) => `- \`${f.file}\` (Reason: ${f.error})`)
  .join('\n')}
`
  }

  if (totalConflicts === 0 && unprocessedFiles.length === 0) {
    console.log('✅ No conflicts detected by parser.')
    // Write an empty report to prevent the workflow from failing.
    await writeOutput('# ✅ No conflicts detected', outputFile)
    return
  }

  await writeOutput(report, outputFile)
}
