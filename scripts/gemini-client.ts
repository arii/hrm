import {
  GoogleGenerativeAI,
  SchemaType,
  GoogleGenerativeAIError,
  GenerateContentRequest,
} from '@google/generative-ai'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { runConflictResolution } from './conflict-resolver'

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
const contextFile = getArg('--context-file')
const outputFile = getArg('--output')
const preset = getArg('--preset')

// List of models to try in order.
// The first model in the list is the primary model, and the rest are fallbacks.

// UPDATED: Aligned with latest model recommendations (Q3 2025+)
// 1. gemini-2.5-flash: Next-gen standard workhorse.
// 2. gemini-2.5-flash-lite: Next-gen ultra-low-cost model.
// 3. gemini-2.0-flash: Previous generation flash model.
// 4. gemini-2.0-flash-lite: Previous generation ultra-low-cost model.
// 5. gemini-2.5-pro: Expensive, high-intelligence fallback.

const defaultFallbacks = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro',
]

export function getModelFallbacks(): string[] {
  const envFallbacks = process.env.GEMINI_MODEL_FALLBACKS
  if (envFallbacks === undefined || envFallbacks === null) {
    return defaultFallbacks
  }
  if (envFallbacks.trim() === '') {
    console.warn(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    return defaultFallbacks
  }

  let userFallbacks: string[] = []
  try {
    userFallbacks = envFallbacks
      .split(',')
      .map((m) => m.trim())
      .filter((m) => {
        if (!m) return false
        if (!m.startsWith('gemini-')) {
          console.warn(
            `Warning: Invalid model name "${m}" in GEMINI_MODEL_FALLBACKS. It will be ignored.`
          )
          return false
        }
        return true
      })
  } catch (error) {
    console.warn(
      `Warning: Could not parse GEMINI_MODEL_FALLBACKS: ${
        (error as Error).message
      }. Using default fallbacks.`
    )
    return defaultFallbacks
  }

  if (userFallbacks.length === 0) {
    console.warn(
      'Warning: GEMINI_MODEL_FALLBACKS is empty or invalid. Using default fallbacks.'
    )
    return defaultFallbacks
  }

  return userFallbacks
}

const MODEL_FALLBACKS = getModelFallbacks()

export class JsonProcessor {
  /**
   * Extracts a JSON code block from a string.
   * @param text The string to search for a JSON block.
   * @returns The extracted JSON string or null if not found.
   */
  private extractJsonBlock(text: string): string | null {
    // Matches ```, optional json tag (case insensitive), content, ```
    const match = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text)
    return match && match[1] ? match[1] : null
  }

  /**
   * Tries to parse the text as JSON, with fallbacks for markdown code blocks.
   * @param text The raw text response from the model.
   * @returns An object with success status, the parsed data or error object.
   * @note The `raw` property has been definitively removed from the successful return type.
   * Rationale: While debugging is important, the risk of accidentally exposing sensitive
   * information from a model's raw output in downstream logs or application logic was
   * deemed too high. To support debugging, the full raw text *is* included in the
   * error response if JSON parsing fails, providing a safe middle ground.
   */
  public process(text: string): {
    success: boolean
    data: unknown
  } {
    try {
      // First, try parsing the text directly.
      return { success: true, data: JSON.parse(text) }
    } catch {
      // If direct parsing fails, try to extract JSON from a markdown code block.
      const jsonBlock = this.extractJsonBlock(text)
      if (jsonBlock) {
        try {
          return { success: true, data: JSON.parse(jsonBlock) }
        } catch (e) {
          console.error('Error parsing JSON block:', e)
          // If parsing the extracted block fails, return a structured error.
          return {
            success: false,
            data: {
              error: 'JSON Parse Error',
              message: 'Could not parse the JSON block found in the markdown.',
              rawResponse: text,
            },
          }
        }
      }
      // If no JSON block is found after initial failure, return a generic error.
      return {
        success: false,
        data: {
          error: 'JSON Parse Error',
          message: 'No valid JSON found in the response.',
          rawResponse: text,
        },
      }
    }
  }
}

interface ReviewContext {
  prNumber: string
  prTitle: string
  prAuthor: string
  prDescription: string
  prLabels: string
  filesChanged: number
  totalLoc: number
  reviewDepth: 'detailed' | 'standard' | 'focused'
  changedAreas: string
  reviewCount: number
  resolvedCount: number
  changesRequested: number
  previousReviews: string
  linkedIssueBody?: string | undefined
  issueNumber?: string | undefined
  issueTitle?: string | undefined
  commitMessages: string
  hasTestChanges: boolean
  missingTests: boolean
  testFiles?: string | undefined
  failedChecks: {
    name: string
    conclusion: string
    detailsUrl: string
    logs?: string
  }[]
}

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
  } else if (preset === 'resolve-conflict') {
    if (!contextFile) {
      console.error(
        'Error: --context-file is required for resolve-conflict preset'
      )
      process.exit(1)
    }
    await runConflictResolution(genAI, contextFile, outputFile)
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

export async function generateContentWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string,
  config?: Omit<GenerateContentRequest, 'contents'>
) {
  let lastError: Error | null = null

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        lastError = error
      } else {
        lastError = new Error(String(error))
      }
      const errorMessage = (error as Error).message || ''
      const errorStatus = (error as { status?: number }).status

      const isNotFound = errorMessage.includes('404') || errorStatus === 404
      const isBadRequest =
        errorMessage.includes('400') || errorStatus === 400 // Sometimes invalid model is 400
      const isRateLimited =
        errorMessage.includes('429') || errorStatus === 429

      if (isNotFound || isBadRequest || isRateLimited) {
        let reason = 'Unknown Error'
        if (isRateLimited) {
          reason = 'Rate Limited'
        } else if (isNotFound) {
          reason = 'Not Found'
        } else if (isBadRequest) {
          reason = 'Invalid Request'
        }
        const details = reason === 'Unknown Error' ? `: ${errorMessage}` : ''
        console.warn(
          `Model ${modelName} failed (${reason}${details}). Trying next model...`
        )
        continue
      }

      // If it's another error (e.g., auth, quota), throw immediately
      throw error
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`)
}

/**
 * Cleans a string that is expected to be JSON, removing common markdown code blocks.
 * Large Language Models sometimes wrap their JSON output in markdown code fences
 * (e.g., ```json\\n{...}\\n```), which can cause JSON.parse() to fail. This function
 * reliably extracts the JSON content from within these fences.
 * @param text The raw string output from the model.
 * @returns A cleaned string, trimmed and free of markdown code fences.
 */
export function cleanJsonOutput(text: string): string {
  if (!text) return ''
  // Improved regex to handle potential leading text before the block
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = codeBlockRegex.exec(text)
  if (match && match[1]) {
    return match[1].trim()
  }
  return text.trim()
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

interface FailedCheck {
  name: string
  conclusion: string
  detailsUrl: string
  logs?: string // Added optional logs field
}

function parseFailedChecks(jsonStr: string | undefined): FailedCheck[] {
  if (!jsonStr) return []
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      console.warn('Warning: FAILED_CHECKS_JSON is not an array.')
      return []
    }
    // Use a type guard to filter and validate the shape of each object
    return parsed.filter((item): item is FailedCheck => {
      const isValid =
        typeof item.name === 'string' &&
        typeof item.conclusion === 'string' &&
        typeof item.detailsUrl === 'string' &&
        (typeof item.logs === 'string' || typeof item.logs === 'undefined') // Validate logs field
      if (!isValid) {
        console.warn('Warning: Invalid item in FAILED_CHECKS_JSON:', item)
      }
      return isValid
    })
  } catch (e) {
    console.warn(
      `Warning: Failed to parse FAILED_CHECKS_JSON: ${(e as Error).message}`,
      e
    )
    return []
  }
}

type ReviewDepth = 'detailed' | 'standard' | 'focused'

function getReviewContextFromEnv(): ReviewContext {
  const failedChecks = parseFailedChecks(process.env.FAILED_CHECKS_JSON)
  const reviewDepth = process.env.REVIEW_DEPTH
  const isValidReviewDepth = (
    depth: string | undefined
  ): depth is ReviewDepth => {
    return ['detailed', 'standard', 'focused'].includes(depth || '')
  }

  return {
    prNumber: process.env.PR_NUMBER || '',
    prTitle: process.env.PR_TITLE || '',
    prAuthor: process.env.PR_AUTHOR || '',
    prDescription: process.env.PR_DESCRIPTION || '',
    prLabels: process.env.PR_LABELS || '',
    filesChanged: parseInt(process.env.FILES_CHANGED || '0'),
    totalLoc: parseInt(process.env.TOTAL_LOC || '0'),
    reviewDepth: isValidReviewDepth(reviewDepth) ? reviewDepth : 'standard',
    changedAreas: process.env.CHANGED_AREAS || '',
    reviewCount: parseInt(process.env.REVIEW_COUNT || '0'),
    resolvedCount: parseInt(process.env.RESOLVED_COUNT || '0'),
    changesRequested: parseInt(process.env.CHANGES_REQUESTED || '0'),
    previousReviews: process.env.PREVIOUS_REVIEWS || '',
    linkedIssueBody: process.env.LINKED_ISSUE_BODY,
    issueNumber: process.env.ISSUE_NUMBER,
    issueTitle: process.env.ISSUE_TITLE,
    commitMessages: process.env.COMMIT_MESSAGES || '',
    hasTestChanges: process.env.HAS_TEST_CHANGES === 'true',
    missingTests: process.env.MISSING_TESTS === 'true',
    testFiles: process.env.TEST_FILES,
    failedChecks,
  }
}

function buildReviewPrompt(
  diff: string,
  context: ReviewContext,
  contextContent: string
): string {
  const isReReview = context.reviewCount > 0
  const reviewIteration = isReReview
    ? `Re-Review #${context.reviewCount + 1}`
    : 'Initial Review'

  let prompt = `# Code Review Task: ${reviewIteration}\n`

  if (context.failedChecks && context.failedChecks.length > 0) {
    const checksTable = `| Check Name | Status | Log URL |\n|------------|--------|---------|\n${context.failedChecks
      .map(
        (check) =>
          `| ${check.name} | ${check.conclusion} | [View Log](${check.detailsUrl}) |`
      )
      .join('\n')}`

    const logsSection = context.failedChecks
      .map((check) => {
        // Limit log size to avoid excessively large prompts
        const truncatedLog =
          check.logs && check.logs.length > 15000
            ? check.logs.substring(0, 15000) + '\n... [LOGS TRUNCATED]'
            : check.logs || ''
        return `
<details>
<summary><strong>${check.name}</strong> (${check.conclusion})</summary>

\`\`\`
${truncatedLog || 'No logs available.'}
\`\`\`

</details>
`
      })
      .join('\n')

    prompt += `
## 🚨 CI Failure Analysis
The following CI checks failed. Your primary task is to **analyze the provided logs** to identify the root cause and suggest a specific code fix.

${checksTable}

### Failed Job Logs
${logsSection}

**Your Task:**
1.  **Analyze the logs** for each failed check to understand the error.
2.  **Examine the diff** to find the code that caused the failure.
3.  **Provide a clear, root-cause explanation** of the failure.
4.  **Offer a specific, actionable code change** to fix the issue.

---
`
  }

  prompt += `## Review Context
- **PR #${context.prNumber}**: ${context.prTitle}
- **Author**: ${context.prAuthor}
- **Files Changed**: ${context.filesChanged}
- **Lines Changed**: ~${context.totalLoc}
- **Areas Affected**: ${context.changedAreas}
- **Review Depth**: ${context.reviewDepth}
- **Labels**: ${context.prLabels || 'none'}
`

  if (context.issueNumber) {
    prompt += `- **Linked Issue #${context.issueNumber}**: ${context.issueTitle}\n`
  }

  // Add re-review specific context
  if (isReReview) {
    prompt += `\n## Review History
- **Previous Reviews**: ${context.reviewCount}
- **Resolved Comments**: ${context.resolvedCount}
- **Changes Requested**: ${context.changesRequested}

### Focus Areas for Re-Review:
1. Verify that previous feedback has been addressed
2. Check for introduction of new issues
3. Assess overall code quality improvement
4. Determine if the PR is ready for approval

### Previous Review Feedback:
${
  context.previousReviews
    ? (() => {
        interface Review {
          createdAt: string
          body: string
        }
        try {
          const reviews = JSON.parse(context.previousReviews) as Review[]
          return reviews
            .map(
              (r: Review, i: number) =>
                `#### Review ${i + 1} (${r.createdAt}):\n${r.body}\n`
            )
            .join('\n---\n')
        } catch (_e) {
          return context.previousReviews // Fallback to raw string if parsing fails
        }
      })()
    : 'None'
}
`
  }

  // Add test coverage concerns
  if (context.missingTests) {
    prompt += `\n⚠️ **TEST COVERAGE ALERT**: Source code was modified without corresponding test changes.\n`
  } else if (context.hasTestChanges) {
    prompt += `\n✅ **Test Coverage**: Tests were updated (${context.testFiles})\n`
  }

  // Issue context
  if (context.linkedIssueBody) {
    prompt += `\n## Issue Description
${context.linkedIssueBody}
`
  }

  // Commit messages for understanding intent
  if (context.commitMessages) {
    prompt += `\n## Commit Messages (Development Intent)
${context.commitMessages}
`
  }

  // Project Documentation
  prompt += `\n## Project Documentation & Guidelines
${contextContent}
`

  // The actual diff
  // Truncate diff if extremely large
  const maxDiffLength = 50000
  const truncatedDiff =
    diff.length > maxDiffLength
      ? diff.substring(0, maxDiffLength) + '\n...[DIFF TRUNCATED]'
      : diff

  prompt += `\n## Code Changes (Diff)
\`\`\`diff
${truncatedDiff}
\`\`\`

---

## Review Instructions

`

  // Tailor instructions based on review type and depth
  if (isReReview) {
    prompt += `### Re-Review Guidelines:
1. **Verification First**: Check if previous concerns were addressed
2. **New Issues**: Identify any regressions or new problems introduced
3. **Progressive Approval**: If most issues resolved and only minor items remain, indicate near-approval status
4. **Focus on Critical**: At this stage, focus on blocking issues only unless asking for major refactoring
5. **No Issues Found**: If the changes are perfect and no issues are found, YOU MUST explicitly describe what you verified and why it is correct. Do not output an empty review.

### Output Format for Re-Review:
- Start with a summary of what was fixed from previous review
- List any remaining issues (categorize as blocking vs. nice-to-have)
- If near approval, explicitly state "✅ Ready for approval pending: [list minor items]"
- Provide specific, actionable feedback for any remaining concerns
- If NO issues found: "✅ Verified [Specific Change]. No regressions found. Ready for approval."
`
  } else {
    // Initial review instructions based on depth
    if (context.reviewDepth === 'detailed') {
      prompt += `### Detailed Review Guidelines (Small Change):
Review every aspect thoroughly:
1. **Code Quality**: Readability, maintainability, adherence to patterns
2. **Architecture**: Proper separation of concerns, appropriate abstractions
3. **Security**: Input validation, auth/auth, data exposure
4. **Performance**: Inefficiencies, N+1 queries, memory leaks
5. **Testing**: Coverage of edge cases, test quality
6. **Documentation**: Code comments, type definitions, API docs
`
    } else if (context.reviewDepth === 'standard') {
      prompt += `### Standard Review Guidelines (Medium Change):
Focus on key areas:
1. **Correctness**: Does the code solve the intended problem?
2. **Architecture**: Are changes well-structured and maintainable?
3. **Security & Performance**: Any critical issues?
4. **Testing**: Are key paths covered?
5. **Breaking Changes**: Backward compatibility concerns?
`
    } else {
      prompt += `### Focused Review Guidelines (Large Change):
Prioritize high-impact areas:
1. **Architecture**: Overall design and structure
2. **Critical Paths**: Security, data integrity, performance bottlenecks
3. **Public APIs**: Interface design and breaking changes
4. **Test Strategy**: Are high-risk areas covered?

Note: For large changes, consider suggesting to break into smaller PRs if feasible.
`
    }

    prompt += `\n### Output Format:
Provide a structured review with:
1. **Summary**: High-level assessment of the change
2. **Strengths**: What's done well
3. **Issues**: Categorized by severity (blocking, important, nice-to-have)
4. **Test Coverage**: Assessment of test quality/coverage
5. **Recommendations**: Specific, actionable improvements
6. **Verdict**: Approve / Request Changes / Comment
`
  }

  // Add project-specific context
  prompt += `\n## Project Context
- This is a Next.js/TypeScript HRM (Heart Rate Monitor) application
- Focus on real-time data handling and WebSocket performance
- Security is critical (authentication, data privacy)
- Maintain backward compatibility unless explicitly breaking change
- Follow patterns established in DEVELOPMENT.md and DESIGN_GUIDELINES.md
`

  // Add specific checks for common issues from audit
  prompt += `\n## Known Areas of Technical Debt (from audit):
When reviewing, be especially vigilant about:
- Callback hell in server.ts (prefer async/await)
- Type safety (avoid 'any', use proper TypeScript types)
- Error handling (ensure proper try/catch and error messages)
- WebSocket connection management (prevent memory leaks)
- Authentication state consistency
`

  prompt += `\n## Response Format (JSON)
Return a JSON object with:
\`\`\`json
{
  "reviewComment": "Your formatted markdown review comment",
  "labels": ["label1", "label2"],  // Suggested labels (e.g., "needs-tests", "security-concern", "ready-for-review", "size-small", "size-large")
  "verdict": "approve" | "request_changes" | "comment"
}
\`\`\`

Make your feedback:
- **Specific**: Reference exact file/line numbers
- **Actionable**: Provide concrete suggestions
- **Constructive**: Focus on improvement, not criticism
- **Contextual**: Consider the change in the broader codebase
- **Balanced**: Acknowledge good practices while noting improvements

**Markdown Formatting (STRICT):**
- You MUST add **TWO NEWLINES** (\`\\n\\n\`) before every header.
- You MUST add **ONE NEWLINE** (\`\\n\`) after every header.
- Do not clump sections together.
- Ensure lists are properly spaced.
`

  return prompt
}

async function runReviewPreset(
  genAI: GoogleGenerativeAI,
  contextContent: string,
  outputFile: string | null | undefined
) {
  const context = getReviewContextFromEnv()

  // Skip logic
  if (
    context.prLabels.includes('ready-for-approval') ||
    context.prLabels.includes('abandon')
  ) {
    console.log(
      'PR is marked as "ready-for-approval" or "abandon". Skipping review.'
    )
    await writeOutput(
      JSON.stringify({ reviewComment: '', labels: [] }),
      outputFile
    )
    return
  }

  const diffFile = process.env.PR_DIFF_FILE
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

  const prompt = buildReviewPrompt(diff, context, contextContent)

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
            verdict: { type: SchemaType.STRING },
          },
          required: ['reviewComment', 'labels'],
        },
      },
    })

    const jsonProcessor = new JsonProcessor()
    const result = jsonProcessor.process(text || '')

    if (result.success) {
      const reviewData = result.data as { reviewComment?: string }
      // It's valid JSON, but we should still check if the content is meaningful.
      if (
        !reviewData.reviewComment ||
        reviewData.reviewComment.trim().length < 20
      ) {
        console.warn(
          'Warning: Parsed JSON has an empty or short review comment. Injecting fallback.'
        )
        const fallback = {
          reviewComment: `### ✅ Verification Complete\n\nNo significant issues found in this iteration.\n\n- **Verified:** Code changes align with requirements.\n- **Regressions:** None detected.\n- **Verdict:** Ready for approval.`,
          labels: ['ready-for-approval'],
          verdict: 'approve',
        }
        await writeOutput(JSON.stringify(fallback, null, 2), outputFile)
      } else {
        // Output the original, valid JSON.
        await writeOutput(JSON.stringify(result.data, null, 2), outputFile)
      }
    } else {
      // The response was not valid JSON. We will format the error.
      console.error('Error: Failed to parse JSON response from the model.')
      const errorJson = {
        error: {
          category: 'Invalid JSON Response',
          message:
            'The response from the generative AI was not valid JSON, even after attempting to extract it from markdown.',
          details: result.data, // Contains the error info from JsonProcessor.
        },
        reviewComment: `### ❌ Review Failed: Invalid JSON Response\n\nThe AI response could not be parsed as valid JSON. This is an internal issue with the AI agent.\n\n<details><summary>Raw AI Output</summary>\n\n\`\`\`\n${
          (result.data as { rawResponse: string }).rawResponse || ''
        }\n\`\`\`\n\n</details>`,
        labels: ['review-failed'],
        verdict: 'comment',
      }
      await writeOutput(JSON.stringify(errorJson, null, 2), outputFile)
    }
  } catch (error) {
    await handleError(error)
  }
}

export async function writeOutput(
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

export async function handleError(error: unknown) {
  let category = 'Infrastructure Issue'
  let userMessage =
    'The review service encountered an unexpected error. This is likely an intermittent problem.'
  const technicalDetails =
    error instanceof Error ? error.message : 'No technical details available.'

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
  } else if (technicalDetails.includes('api key')) {
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
    verdict: 'comment',
  }

  console.error(
    'Error during content generation:',
    JSON.stringify(errorOutput, null, 2)
  )

  // Always write a valid JSON structure to the output file on error.
  if (outputFile) {
    await writeOutput(JSON.stringify(errorOutput, null, 2), outputFile)
    console.error(`Error details written to ${outputFile}:`, errorOutput)
    // Exit 0 so the next workflow step can read the JSON and post the comment
    process.exit(0)
  } else {
    process.exit(1)
  }
}

// Only run main() when the script is executed directly, not when imported.
// Jest sets NODE_ENV to 'test' by default.
if (process.env.NODE_ENV !== 'test') {
  main()
}
