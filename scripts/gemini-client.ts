import {
  GoogleGenerativeAI,
  SchemaType,
  GoogleGenerativeAIError,
} from '@google/generative-ai'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

// Simple arg parsing
const args = process.argv.slice(2)
const getArg = (key: string) => {
  const index = args.indexOf(key)
  if (index !== -1 && index + 1 < args.length) return args[index + 1]
  return null
}

const task = getArg('--task')
const taskFile = getArg('--task-file')
const contextFiles = getArg('--context')?.split(',') || []
const outputFile = getArg('--output')
const preset = getArg('--preset')

// List of models to try in order.
// Prioritizing newer models as requested to fix 404 errors with older/deprecated ones.
const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.')
    process.exit(1)
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  let contextContent = ''
  for (const file of contextFiles) {
    const trimmedFile = file.trim()
    if (!trimmedFile) continue
    try {
      const content = await readFile(
        path.resolve(process.cwd(), trimmedFile),
        'utf-8'
      )
      contextContent += `\n\n--- Start of Context File: ${trimmedFile} ---\n${content}\n--- End of Context File: ${trimmedFile} ---\n`
    } catch (error) {
      console.warn(
        `Warning: Could not read context file ${trimmedFile}: ${(error as Error).message}`
      )
      contextContent += `\n\n--- Context File: ${trimmedFile} (MISSING/ERROR) ---\n`
    }
  }

  if (preset === 'review') {
    await runReviewPreset(genAI, contextContent, outputFile)
  } else {
    // Default/Generic mode
    let finalTask = task
    if (taskFile) {
      try {
        finalTask = await readFile(
          path.resolve(process.cwd(), taskFile),
          'utf-8'
        )
      } catch (e) {
        console.error(`Error reading task file ${taskFile}:`, e)
        process.exit(1)
      }
    }

    if (!finalTask) {
      console.error(
        'Usage: npx tsx scripts/gemini-client.ts --task "task description" OR --task-file "path/to/task.txt" [--context "file1.md,file2.md"] [--output "output.md"]'
      )
      process.exit(1)
    }
    await runGenericTask(genAI, finalTask, contextContent, outputFile)
  }
}

async function generateContentWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string,
  config?: any
) {
  let lastError

  for (const modelName of MODEL_FALLBACKS) {
    console.log(`Attempting to use model: ${modelName}...`)
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...config,
      })
      console.log(`Successfully generated content using ${modelName}.`)
      return result.response.text()
    } catch (error: any) {
      lastError = error
      const isNotFound = error.message?.includes('404') || error.status === 404
      const isBadRequest =
        error.message?.includes('400') || error.status === 400 // Sometimes invalid model is 400

      if (isNotFound || isBadRequest) {
        console.warn(
          `Model ${modelName} failed (Not Found/Invalid). Trying next model...`
        )
        continue
      }

      // If it's another error (e.g., auth, quota), throw immediately
      throw error
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`)
}

async function runGenericTask(
  genAI: GoogleGenerativeAI,
  task: string,
  contextContent: string,
  outputFile: string | null | undefined
) {
  const prompt = `
You are an AI assistant helping with a software project.
Please use the provided context files to inform your response.
Do not hallucinate content that is not in the context files if you are asked about specifics of the project.

${contextContent}

--- Task ---
${task}
`

  try {
    const text = await generateContentWithFallback(genAI, prompt)
    await writeOutput(text, outputFile)
  } catch (error) {
    handleError(error)
  }
}

async function runReviewPreset(
  genAI: GoogleGenerativeAI,
  contextContent: string,
  outputFile: string | null | undefined
) {
  const prTitle = process.env.PR_TITLE || 'Unknown Title'
  const prAuthor = process.env.PR_AUTHOR || 'Unknown Author'
  const prHeadRef = process.env.PR_HEAD_REF || 'unknown-head'
  const prBaseRef = process.env.PR_BASE_REF || 'unknown-base'
  const prDescription = process.env.PR_DESCRIPTION || 'No description.'
  const diffFile = process.env.PR_DIFF_FILE
  const linkedIssueBody = process.env.LINKED_ISSUE_BODY
  const existingComments = process.env.EXISTING_COMMENTS
  const prLabels = process.env.PR_LABELS || ''
  const commentCount = parseInt(process.env.COMMENT_COUNT || '0')

  // 1. Enhanced Loop Detection / Skip Logic
  const labelsList = prLabels.split(',').map((l) => l.trim())
  if (
    labelsList.includes('ready-for-approval') ||
    labelsList.includes('abandon')
  ) {
    console.log(
      'PR is marked as "ready-for-approval" or "abandon". Skipping review.'
    )
    // Write a "no-op" result so the workflow doesn't fail
    await writeOutput(
      JSON.stringify({ reviewComment: '', labels: [] }),
      outputFile
    )
    return
  }

  // Enhanced: Prevent review loops on persistent linting issues
  if (commentCount > 5 && labelsList.includes('needs-improvement')) {
    console.log(
      'Multiple review cycles detected. Suggesting manual intervention.'
    )
    await writeOutput(
      JSON.stringify({
        reviewComment:
          '**Review Cycle Limit Reached**\n\nThis PR has undergone multiple review cycles with persistent issues. Consider:\n- Manual linting fix (`npx eslint --fix`)\n- Fresh branch/rebase\n- Pair programming session\n\nSkipping automated review to prevent noise.',
        labels: ['needs-manual-intervention'],
      }),
      outputFile
    )
    return
  }

  if (!diffFile) {
    console.error('Error: PR_DIFF_FILE env var is required for review preset')
    await writeOutput(
      JSON.stringify({ reviewComment: '', labels: [] }),
      outputFile
    )
    return
  }

  let diff = ''
  try {
    diff = await readFile(diffFile, 'utf-8')
  } catch (e) {
    console.error(`Error reading diff file ${diffFile}:`, e)
    process.exit(1)
  }

  if (!diff || diff.trim().length === 0) {
    console.log('Diff is empty. Skipping review.')
    await writeOutput(
      JSON.stringify({ reviewComment: '', labels: [] }),
      outputFile
    )
    return
  }

  // Truncate diff if extremely large
  const maxDiffLength = 50000
  const truncatedDiff =
    diff.length > maxDiffLength
      ? diff.substring(0, maxDiffLength) + '\n...[DIFF TRUNCATED]'
      : diff

  let reviewTypeInstructions = ''
  if (existingComments) {
    reviewTypeInstructions = `
      **Review Type:** Subsequent Review

      **Instructions for THIS review:**
      This is a follow-up review. The user has pushed new changes after your previous feedback.
      Your task is to re-evaluate the Pull Request.
      1.  **Acknowledge Previous Feedback:** Briefly mention the previous comments.
      2.  **Focus on Resolution:** Determine if your previous concerns have been addressed in the new diff.
      3.  **Avoid Repetition:** DO NOT repeat feedback for issues that have been fixed.
      4.  **New Issues:** Identify any new issues introduced in this update.
      5.  **Be Concise:** Keep the review focused on the changes since the last one.

      **Previous Review Comments (for your context):**
      \`\`\`
      ${existingComments}
      \`\`\`
    `
  } else {
    reviewTypeInstructions = `
      **Review Type:** Initial Review

      **Instructions for THIS review:**
      This is the first time you are reviewing this Pull Request.
      Provide a thorough and critical analysis of the code changes.
      Focus on code quality, security, and adherence to project guidelines.
    `
  }

  if (linkedIssueBody) {
    reviewTypeInstructions += `
      **Linked Issue Context:**
      The following context is from the issue linked to this PR (#${process.env.ISSUE_NUMBER}). Use it to verify that the PR's changes fully address the issue's requirements.
      \`\`\`
      ${linkedIssueBody}
      \`\`\`
    `
  }

  const prompt = `
    **Role:** You are a Principal Software Engineer acting as a strict, critical code reviewer.

    **Task:** Review the following Pull Request Diff.

    ${reviewTypeInstructions}

    **Context:**
    - **PR Title:** ${prTitle}
    - **Author:** ${prAuthor}
    - **Branches:** ${prHeadRef} -> ${prBaseRef}
    - **Description:** ${prDescription}

    **Project Documentation & Guidelines (Use these to inform your review):**
    ${contextContent}

    **Critical Instructions:**
    1. **Be Skeptical:** Your default stance is to request changes. Only approve if the code is excellent.
    2. **Enhanced Scope Enforcement:**
       - **Architecture Violation**: If modifying core hooks (useVolumePreference, useSpotifyWebPlayback, useWorkoutMetrics) without clear justification, FLAG as "CRITICAL ARCHITECTURE CHANGE - Justify removal/modification"
       - **Test Deletion**: If unit tests are deleted/reduced, FLAG as "UNACCEPTABLE TEST COVERAGE REGRESSION - Tests must be preserved or explicitly migrated"
       - **Configuration Creep**: If changing package.json, workflows, or config files in a feature PR, FLAG as "CONFIGURATION SCOPE CREEP - Should be separate PR"
       - **API Contract Changes**: If modifying API error responses (NextResponse.json -> Error), FLAG as "API CONTRACT VIOLATION - Maintain structured responses"
    3. **Anti-Pattern Detection (CRITICAL):**
       - **Magic Strings**: FLAG any conditional logic using string literals like '!== "00:00:00"' or similar brittle conditions
       - **React Hooks Violations**: FLAG direct setState calls in useEffect (causes cascading renders) - require useMemo/useCallback patterns
       - **State Desynchronization**: FLAG showing WebSocket data while updating local preferences without proper coordination
       - **API Flooding**: FLAG immediate onChange handlers without debouncing for external APIs (require 300ms+ debounce)
       - **Missing Error Boundaries**: FLAG async operations without proper finally blocks for cleanup
       - **Hardcoded Values**: FLAG hardcoded colors, spacing, dimensions that should use theme.spacing() or theme.palette
    4. **File Audit:** You MUST list every single file changed.
       - For each file, provide a specific comment.
       - If a file has no obvious issues, you must still explicitly state "Checked - No issues".
       - If a file change seems unnecessary, ask "Why was this file modified?".
    5. **Large Changes:** If the diff is large (>15 files or >500 additions), suggest splitting the PR.
    6. **Technical Debt Integration:**
       - **Audit Priority**: Check if PR addresses items from AUDIT_CODE_HYGIENE.md - prioritize fixing known issues.
       - **ESM Import Verification**: FLAG any imports of local service/utility files that are missing the \`.js\` extension (required for ESM in this project).
       - **Port Strategy Validation**: FLAG any usage of "WS_PORT" or hardcoded ports. Ensure unified usage of "process.env.PORT".
       - **Dependency Compatibility**: If 'package.json' is modified, validate that Next.js and Storybook versions remain compatible.
    7. **Suggestions:** Provide code snippets for fixes.
    8. **Markdown Formatting (STRICT):**
       - You MUST add **TWO NEWLINES** (\`\\n\\n\`) before every header.
       - You MUST add **ONE NEWLINE** (\`\\n\`) after every header.
       - Do not clump sections together.
       - Ensure lists are properly spaced.

    **Output Format (JSON):**
    {
      "reviewComment": "Markdown string containing: \\n\\n### 🛡️ Security & Quality Summary\\n\\n[Summary]\\n\\n### 📂 File-by-File Audit\\n\\n- **file1.ts**: [Comment]\\n- **file2.tsx**: [Comment]\\n...\\n\\n### 💡 Critical Feedback\\n\\n[Deep dive]",
      "labels": ["size-label", "status-label"]
    }

    **Valid Labels:**
    - Size: 'small', 'medium', 'large', 'xl'
    - Status: 'needs-improvement', 'abandon', 'ready-for-approval'

    **Diff:**
    ${truncatedDiff}
  `

  try {
    const text = await generateContentWithFallback(genAI, prompt, {
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            reviewComment: { type: SchemaType.STRING },
            labels: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ['reviewComment', 'labels'],
        },
      },
    })

    await writeOutput(text, outputFile)
  } catch (error) {
    handleError(error)
  }
}

async function writeOutput(
  content: string,
  outputFile: string | null | undefined
) {
  if (outputFile) {
    await writeFile(path.resolve(process.cwd(), outputFile), content)
    console.log(`Output written to ${outputFile}`)
  } else {
    console.log(content)
  }
}

function handleError(error: any) {
  console.error('Error generating content:', error)
  if (
    error instanceof GoogleGenerativeAIError ||
    error.message?.includes('404')
  ) {
    console.error('\nPOSSIBLE CAUSE: All attempted models failed.')
    console.error(
      'Please check your Google AI Studio account and ensure you have access to the Gemini models.'
    )
    console.error(`Tried models: ${MODEL_FALLBACKS.join(', ')}`)
  }
  process.exit(1)
}

main()
