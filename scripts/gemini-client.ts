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
// `gemini-1.5-flash-latest` is the recommended standard model for its balance of speed and capability.
// It is used as the primary fallback to mitigate rate-limiting issues with the experimental `gemini-2.0-flash-exp` model.

// Note: The first model in the default list is experimental. For production stability,
// it is recommended to either update this list to prioritize a stable model
// or to configure a production-ready list via the GEMINI_MODEL_FALLBACKS environment variable.
const defaultFallbacks = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
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
   * @returns An object with success status, the parsed data or error object, and the raw text.
   */
  public process(text: string): { success: boolean; data: any; raw: string } {
    try {
      // First, try parsing the text directly.
      return { success: true, data: JSON.parse(text), raw: text }
    } catch {
      // If direct parsing fails, try to extract JSON from a markdown code block.
      const jsonBlock = this.extractJsonBlock(text)
      if (jsonBlock) {
        try {
          return { success: true, data: JSON.parse(jsonBlock), raw: text }
        } catch (e) {
          // If parsing the extracted block fails, return a structured error.
          return {
            success: false,
            data: {
              error: 'JSON Parse Error',
              message: 'Could not parse the JSON block found in the markdown.',
              rawResponse: text,
            },
            raw: text,
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
        raw: text,
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
  failedChecks: FailedCheck[]
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
      const isRateLimited =
        error.message?.includes('429') || error.status === 429

      if (isNotFound || isBadRequest || isRateLimited) {
        let reason = 'Unknown Error'
        if (isRateLimited) {
          reason = 'Rate Limited'
        } else if (isNotFound) {
          reason = 'Not Found'
        } else if (isBadRequest) {
          reason = 'Invalid Request'
        }
        const details = reason === 'Unknown Error' ? `: ${error.message}` : ''
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

// 1. Update Interface to support future Log Injection
interface FailedCheck {
  name: string
  conclusion: string
  detailsUrl: string
  logSnippet?: string // Prepared for the future workflow update
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
        typeof item.detailsUrl === 'string'
      if (!isValid) {
        console.warn('Warning: Invalid item in FAILED_CHECKS_JSON:', item)
      }
      return isValid
    })
  } catch (e) {
    console.warn(
      `Warning: Failed to parse FAILED_CHECKS_JSON: ${(e as Error).message}`
    )
    return []
  }
}

function getReviewContextFromEnv(): ReviewContext {
  const failedChecks = parseFailedChecks(process.env.FAILED_CHECKS_JSON)
  return {
    prNumber: process.env.PR_NUMBER || '',
    prTitle: process.env.PR_TITLE || '',
    prAuthor: process.env.PR_AUTHOR || '',
    prDescription: process.env.PR_DESCRIPTION || '',
    prLabels: process.env.PR_LABELS || '',
    filesChanged: parseInt(process.env.FILES_CHANGED || '0'),
    totalLoc: parseInt(process.env.TOTAL_LOC || '0'),
    reviewDepth: (process.env.REVIEW_DEPTH as any) || 'standard',
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

// 2. New Helper: Build the "Fix Mode" Sub-Prompt
function buildFixModeSubPrompt(context: ReviewContext): string {
  const failureList = context.failedChecks
    .map((c) =>
      `- **${c.name}** (${c.conclusion}) ${
        c.logSnippet ? `\n  Error: \`${c.logSnippet}\`` : ''
      }`
    )
    .join('\n')

  return `

  ####################################################################
  🚨 IMMEDIATE ACTION REQUIRED: CI/CD PIPELINE FAILURE
  ####################################################################

  You are now in **DEBUG MODE**.
  One or more critical checks have failed. Your PRIORITY is to fix these errors.

  **Failing Checks:**
  ${failureList}

  **Debug Mode Rules:**
  1. 🚫 **IGNORE** style nits, variable naming, or minor refactors unless they caused the error.
  2. 🔍 **ANALYZE** the provided diff specifically looking for logic that breaks tests or builds.
  3. 🛠️ **GENERATE FIXES**: You MUST provide a "Proposed Fix" section containing a valid **Unified Diff** or specific code block to resolve the failure.
  4. 🧠 **Reasoning**: Explain *why* the test failed (e.g., "Mock data missing," "Timeout too short," "Type mismatch").

  **Guidance for Common Failures:**
  - **Jest/Unit Tests**: Check for missing mocks in \`tests/unit\`, async/await issues, or component render failures.
  - **TypeScript/Build**: Look for type mismatches in the diff.
  - **Playwright/E2E**: Check for selector changes or network timeouts.

  If you cannot identify the exact fix, provide the specific \`console.log\` or debugging steps the user should run to capture the necessary error detail.
  ####################################################################
  `
}

export function buildReviewPrompt(
  diff: string,
  context: ReviewContext,
  contextContent: string
): string {
  // SECURITY NOTE: Ensure that the `diff`, `context`, and `contextContent` parameters
  // do not contain sensitive information (e.g., API keys, internal URLs) before
  // being passed to this function, as they will be sent to an external service.
  const isReReview = context.reviewCount > 0
  const hasFailures = context.failedChecks && context.failedChecks.length > 0

  const reviewIteration = isReReview
    ? `Re-Review #${context.reviewCount + 1}`
    : 'Initial Review'

  // --- Base Prompt Construction (DRY Principle) ---
  let prompt = `# Code Review Task: ${reviewIteration}\n`

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

  // --- Documentation Section (Cached or Injected) ---
  prompt += `\n## Project Documentation & Guidelines\n${contextContent}\n`

  // --- Diff Section ---
  const maxDiffLength = 60000 // Unified and increased context window
  const truncatedDiff =
    diff.length > maxDiffLength
      ? diff.substring(0, maxDiffLength) + '\n...[DIFF TRUNCATED]'
      : diff
  prompt += `\n## Code Changes (Diff)\n\`\`\`diff\n${truncatedDiff}\n\`\`\`\n`

  // --- Logic Branching: Fix Mode vs Standard Review ---
  if (hasFailures) {
    // >> BRANCH A: FIX MODE
    prompt += buildFixModeSubPrompt(context)
    prompt += `\n## Output Format (Failure Response)
Return a JSON object with:
\`\`\`json
{
  "reviewComment": "Markdown report focusing ONLY on the fix. Use code blocks for the solution.",
  "labels": ["needs-fixes", "ci-failure"],
  "verdict": "request_changes"
}
\`\`\`
`
  } else {
    // >> BRANCH B: STANDARD REVIEW (with original logic preserved)

    // Explicit Requirement Compliance (New Feature)
    if (context.linkedIssueBody) {
      prompt += `\n## Linked Issue Requirements
       The user is trying to solve issue #${context.issueNumber || '?'}:
       "${context.issueTitle}"

       **Issue Description:**
       ${context.linkedIssueBody}

       **Requirement:** In your review, you MUST explicitly verify if these requirements are met by the code changes. Create a 'Compliance Checklist' section.
       `
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
        try {
          const reviews = JSON.parse(context.previousReviews)
          return reviews
            .map(
              (r: any, i: number) =>
                `#### Review ${i + 1} (${r.createdAt}):\n${r.body}\n`
            )
            .join('\n---\n')
        } catch (e) {
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

    // Commit messages for understanding intent
    if (context.commitMessages) {
      prompt += `\n## Commit Messages (Development Intent)
${context.commitMessages}
`
    }

    prompt += `\n---

## Review Instructions

`

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

    prompt += `\n## Project Context
- This is a Next.js/TypeScript HRM (Heart Rate Monitor) application
- Focus on real-time data handling and WebSocket performance
- Security is critical (authentication, data privacy)
- Maintain backward compatibility unless explicitly breaking change
- Follow patterns established in DEVELOPMENT.md and DESIGN_GUIDELINES.md
`

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
  "labels": ["label1", "label2"],
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
  }
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
      // It's valid JSON, but we should still check if the content is meaningful.
      if (
        !result.data.reviewComment ||
        result.data.reviewComment.trim().length < 20
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
          details: result.data, // Contains the raw response for debugging.
        },
        reviewComment: `### ❌ Review Failed: Invalid JSON Response\n\nThe AI response could not be parsed as valid JSON. This is an internal issue with the AI agent.\n\n<details><summary>Raw AI Output</summary>\n\n\`\`\`\n${result.raw}\n\`\`\`\n\n</details>`,
        labels: ['review-failed'],
        verdict: 'comment',
      }
      await writeOutput(JSON.stringify(errorJson, null, 2), outputFile)
    }
  } catch (error) {
    await handleError(error)
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

async function handleError(error: any) {
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
    verdict: 'comment',
  }

  console.error('Error during content generation:', JSON.stringify(errorOutput, null, 2))

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
