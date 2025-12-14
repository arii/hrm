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

  // 1. Loop Detection / Skip Logic
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
    2. **Scope Enforcement:**
       - If this is a backend PR, FLAG any frontend changes or snapshot updates as "Suspicious Scope Creep".
       - If this is a refactor, FLAG any logic changes that aren't pure cleanup.
    3. **File Audit:** You MUST list every single file changed.
       - For each file, provide a specific comment.
       - If a file has no obvious issues, you must still explicitly state "Checked - No issues".
       - If a file change seems unnecessary, ask "Why was this file modified?".
    4. **Large Changes:** If the diff is large, suggest splitting the PR.
    5. **Suggestions:** Provide code snippets for fixes.
    6. **Markdown Formatting (STRICT):**
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
  let category = 'Infrastructure Issue'
  let userMessage =
    'The review service encountered an unexpected error. This is likely an intermittent problem.'
  const technicalDetails = error.message || 'No technical details available.'

  if (error instanceof GoogleGenerativeAIError) {
    if (error.message.includes('400') || error.message.includes('404')) {
      category = 'Configuration Issue'
      userMessage =
        'All attempted generative models failed, likely due to a configuration or access problem.'
    } else if (error.message.includes('500') || error.message.includes('503')) {
      category = 'Infrastructure Issue'
      userMessage =
        'The generative AI service is temporarily unavailable. Please try again later.'
    }
  } else if (error.message.includes('api key')) {
    category = 'Configuration Issue'
    userMessage = 'The GEMINI_API_KEY is either invalid or missing.'
  }

  const errorOutput = {
    error: {
      category: category,
      message: userMessage,
      details: technicalDetails,
    },
    // Provide a valid structure for the review result to avoid breaking the calling workflow
    reviewComment: `### ❌ Review Failed: ${category}\n\n**Details**: ${userMessage}\n\n<details><summary>Technical Info</summary>\n\n\`\`\`\n${technicalDetails}\n\`\`\`\n\n</details>`,
    labels: ['review-failed'],
  }

  console.error('Error generating content:', JSON.stringify(errorOutput, null, 2))

  // Write the error details to the output file so the workflow can use it
  if (outputFile) {
    writeOutput(JSON.stringify(errorOutput, null, 2), outputFile).catch(
      (writeErr) => {
        console.error('Failed to write error output to file:', writeErr)
      }
    )
  }

  // Still exit with 1 to signal failure to the workflow runner
  process.exit(1)
}

main()
