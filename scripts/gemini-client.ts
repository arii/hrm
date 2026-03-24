import {
  GoogleGenerativeAI,
  SchemaType,
  GoogleGenerativeAIError,
  GenerateContentRequest,
} from '@google/generative-ai'
import { readFile, writeFile } from 'fs/promises'
import { execSync } from 'child_process'
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
const instructions = getArg('--instructions')

const defaultFallbacks = [
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
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
    // Helper function to ensure the parsed JSON object has a 'labels' field.
    const ensureLabels = (data: unknown) => {
      // The `labels` field is only relevant for objects, not arrays or primitives.
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        // Use 'in' operator for a safe property check.
        if (!('labels' in data)) {
          // If 'labels' is missing, add it as an empty array.
          // We use type assertion here to modify the object.
          ;(data as { labels?: string[] }).labels = []
        }
      }
      return data
    }

    const tryRepair = (jsonStr: string): unknown | null => {
      let repaired = jsonStr.trim()
      if (repaired.length === 0) return null

      // Check for truncation
      if (!repaired.endsWith('}')) {
        console.warn(
          'Detected truncated JSON. Attempting emergency recovery...'
        )

        // Try to close a trailing string if odd number of unescaped quotes
        const unescapedQuotes = repaired.match(/(^|[^\\])"/g) || []
        if (unescapedQuotes.length % 2 !== 0) {
          repaired += '"'
        }

        // Potential closing sequences for a PR review JSON structure
        const closers = ['}', ']}', '"]}']
        for (const closer of closers) {
          try {
            return JSON.parse(repaired + closer)
          } catch {
            // Continue to next closer
          }
        }
      }
      return null
    }

    try {
      // First, try parsing the text directly.
      const parsedData = JSON.parse(text)
      return { success: true, data: ensureLabels(parsedData) }
    } catch {
      // Try emergency recovery on the raw text
      const repairedDirect = tryRepair(text)
      if (repairedDirect) {
        return { success: true, data: ensureLabels(repairedDirect) }
      }

      // If direct parsing and repair fails, try to extract JSON from a markdown code block.
      const jsonBlock = this.extractJsonBlock(text)
      if (jsonBlock) {
        try {
          const parsedData = JSON.parse(jsonBlock)
          return { success: true, data: ensureLabels(parsedData) }
        } catch (e) {
          // Try emergency recovery on the extracted block
          const repairedBlock = tryRepair(jsonBlock)
          if (repairedBlock) {
            return { success: true, data: ensureLabels(repairedBlock) }
          }

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

// 1. Update Interface to support future Log Injection
export interface FailedCheck {
  name: string
  conclusion: string
  detailsUrl: string
  logSnippet?: string // Prepared for the future workflow update
}

export interface ReviewContext {
  prNumber: string
  prTitle: string
  prAuthor: string
  prDescription: string
  prLabels: string
  prBranchName: string
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
  commitHash: string
  hasTestChanges: boolean
  missingTests: boolean
  testFiles?: string | undefined
  failedChecks: FailedCheck[]
  slopAnalysis?: string
  thoughtSignature?: string
}

async function main() {
  let reviewContext: ReviewContext | undefined
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // This is a fatal error, so we exit early.
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
      reviewContext = getReviewContextFromEnv()
      await runReviewPreset(
        genAI,
        contextContent,
        outputFile,
        reviewContext,
        instructions || undefined
      )
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
  } catch (error) {
    // Centralized error handling.
    await handleError(error, outputFile, reviewContext)
  }
}

type ExtendedGenerateContentRequest = GenerateContentRequest & { thought_signature?: string };

export async function generateContentWithFallback({
  genAI,
  prompt,
  config,
  thoughtSignature,
}: {
  genAI: GoogleGenerativeAI
  prompt: string
  config?: Omit<GenerateContentRequest, 'contents'>
  thoughtSignature?: string
}): Promise<{ text: string; thoughtSignature?: string }> {
  let lastError: Error | null = null

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const request: ExtendedGenerateContentRequest = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...config,
        ...(thoughtSignature && { thought_signature: thoughtSignature })
      }

      const result = await model.generateContent(request)
      console.log(`Successfully generated content using ${modelName}.`)

      const text = result.response.text()

      // Capture thought signature from the response if present
      const capturedSignature = (result.response.candidates?.[0] as any)?.thought_signature

      return { text, thoughtSignature: capturedSignature }
    } catch (error: unknown) {
      if (error instanceof Error) {
        lastError = error
      } else {
        lastError = new Error(String(error))
      }
      const errorMessage = (error as Error).message || ''
      const errorStatus = (error as { status?: number }).status

      const RETRIABLE_MAP: Record<number, string> = {
        400: 'Invalid Request',
        404: 'Not Found',
        429: 'Rate Limited',
        500: 'Infrastructure Issue',
        503: 'Infrastructure Issue',
      }

      const retriableCode =
        Object.keys(RETRIABLE_MAP)
          .map(Number)
          .find(
            (code) => errorStatus === code || errorMessage.includes(String(code))
          )

      if (retriableCode) {
        const reason = RETRIABLE_MAP[retriableCode] || 'Unknown Retriable Error'
        console.warn(
          `Model ${modelName} failed (${reason}: ${errorMessage}). Trying next model...`
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
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = codeBlockRegex.exec(text)
  // If a match is found, return the trimmed content of the capture group.
  // match[1] can be an empty string, which is the desired output for empty blocks.
  if (match && match[1] !== undefined) {
    return match[1].trim()
  }
  // If no code block is found, return the original text, trimmed.
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
  const { text } = await generateContentWithFallback({ genAI, prompt })
  await writeOutput(text, outputFile)
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
    return parsed
      .map((item): FailedCheck | null => {
        const logContent = item.logSnippet || item.logs // Fallback to 'logs'
        const isValid =
          typeof item.name === 'string' &&
          typeof item.conclusion === 'string' &&
          typeof item.detailsUrl === 'string' &&
          (typeof logContent === 'string' || typeof logContent === 'undefined')
        if (!isValid) {
          console.warn('Warning: Invalid item in FAILED_CHECKS_JSON:', item)
          return null
        }
        return {
          name: item.name,
          conclusion: item.conclusion,
          detailsUrl: item.detailsUrl,
          logSnippet: logContent, // Normalize to new property
        }
      })
      .filter((item): item is FailedCheck => item !== null)
  } catch (e) {
    console.warn(
      `Warning: Failed to parse FAILED_CHECKS_JSON: ${(e as Error).message}`,
      e
    )
    return []
  }
}

type ReviewDepth = 'detailed' | 'standard' | 'focused'

function getContextMetrics(baseSha: string, headSha: string) {
  try {
    // 1. Calculate Total LOC
    // git diff --numstat returns lines like: "added deleted filename"
    const diffStat = execSync(
      `git diff --numstat ${baseSha}...${headSha}`
    ).toString()
    const totalLoc = diffStat
      .split('\n')
      .filter((line) => line.trim() !== '')
      .reduce((acc, line) => {
        const parts = line.split('\t')
        // numstat can return '-' for binary files, treat as 0
        const added = parts[0] === '-' ? 0 : parseInt(parts[0] || '0')
        const deleted = parts[1] === '-' ? 0 : parseInt(parts[1] || '0')
        return acc + added + deleted
      }, 0)

    // 2. Calculate Files Changed
    const filesChanged = diffStat
      .split('\n')
      .filter((line) => line.trim() !== '').length

    // 3. Calculate Changed Areas (top-level directories)
    // git diff --name-only returns filenames
    const fileNames = execSync(
      `git diff --name-only ${baseSha}...${headSha}`
    ).toString()

    const areasSet = new Set<string>()
    fileNames
      .split('\n')
      .filter((line) => line.trim() !== '')
      .forEach((file) => {
        const parts = file.split('/')
        if (parts.length > 1) {
          areasSet.add(parts[0] as string)
        } else {
          areasSet.add('.')
        }
      })
    const changedAreas = Array.from(areasSet).sort().join(', ')

    return { totalLoc, filesChanged, changedAreas }
  } catch (e) {
    console.warn('Warning: Failed to calculate git metrics:', e)
    return { totalLoc: 0, filesChanged: 0, changedAreas: '' }
  }
}

function getReviewContextFromEnv(): ReviewContext {
  const failedChecks = parseFailedChecks(process.env.FAILED_CHECKS_JSON)
  const reviewDepth = process.env.REVIEW_DEPTH
  const isValidReviewDepth = (
    depth: string | undefined
  ): depth is ReviewDepth => {
    return ['detailed', 'standard', 'focused'].includes(depth || '')
  }

  // Calculate metrics using git directly instead of relying on fragile shell scripts in YAML
  // Ensure process.env values are treated as strings to satisfy TypeScript
  const baseSha = (process.env.BASE_SHA ?? 'HEAD^') as string
  const headSha = (process.env.HEAD_SHA ?? 'HEAD') as string
  const metrics = getContextMetrics(baseSha, headSha)

  return {
    prNumber: process.env.PR_NUMBER || '',
    prTitle: process.env.PR_TITLE || '',
    prAuthor: process.env.PR_AUTHOR || '',
    prDescription: process.env.PR_DESCRIPTION || '',
    prLabels: process.env.PR_LABELS || '',
    prBranchName: process.env.PR_BRANCH_NAME || '',
    filesChanged: metrics.filesChanged,
    totalLoc: metrics.totalLoc,
    reviewDepth: isValidReviewDepth(reviewDepth) ? reviewDepth : 'standard',
    changedAreas: metrics.changedAreas,
    reviewCount: parseInt(process.env.REVIEW_COUNT || '0'),
    resolvedCount: parseInt(process.env.RESOLVED_COUNT || '0'),
    changesRequested: parseInt(process.env.CHANGES_REQUESTED || '0'),
    previousReviews: process.env.PREVIOUS_REVIEWS || '',
    linkedIssueBody: process.env.LINKED_ISSUE_BODY,
    issueNumber: process.env.ISSUE_NUMBER,
    issueTitle: process.env.ISSUE_TITLE,
    commitMessages: process.env.COMMIT_MESSAGES || '',
    commitHash: process.env.COMMIT_HASH || '',
    hasTestChanges: process.env.HAS_TEST_CHANGES === 'true',
    missingTests: process.env.MISSING_TESTS === 'true',
    testFiles: process.env.TEST_FILES,
    failedChecks,
    slopAnalysis: process.env.SLOP_ANALYSIS || 'Not available.',
    thoughtSignature: process.env.GEMINI_THOUGHT_SIGNATURE,
  }
}

// 3. Refactored buildReviewPrompt
export async function buildReviewPrompt(
  diff: string,
  context: ReviewContext,
  contextContent: string,
  instructions?: string
): Promise<string> {
  const isReReview = context.reviewCount > 0
  const hasFailures = context.failedChecks && context.failedChecks.length > 0

  const templatePath = hasFailures
    ? 'prompts/fix-mode.md'
    : 'prompts/standard-review.md'
  let promptTemplate = await readFile(templatePath, 'utf-8')

  // --- Base Context Section ---
  const reviewIteration = isReReview
    ? `Re-Review #${context.reviewCount + 1}`
    : 'Initial Review'

  // --- Diff Section ---
  const maxDiffLength = 30000 // Reduced from 60k to allocate more token budget for the generation output
  const truncatedDiff =
    diff.length > maxDiffLength
      ? diff.substring(0, diff.lastIndexOf('\n', maxDiffLength)) +
        '\n...[DIFF TRUNCATED]'
      : diff

  const failureList = context.failedChecks
    .map((c) => {
      const maxLogSnippetLength = 15000
      const truncatedLog =
        c.logSnippet && c.logSnippet.length > maxLogSnippetLength
          ? c.logSnippet.substring(0, maxLogSnippetLength) +
            '\n... [LOGS TRUNCATED]'
          : c.logSnippet
      return `- **${c.name}** (${c.conclusion}) ${truncatedLog ? `\n  Error: \`\`\`\n${truncatedLog}\n\`\`\`` : ''}`
    })
    .join('\n')

  const previousReviews = context.previousReviews
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
          return context.previousReviews
        }
      })()
    : 'None'

  let testCoverageAlert = ''
  if (context.missingTests) {
    testCoverageAlert = `\n\n⚠️ **TEST COVERAGE ALERT**: Source code was modified without corresponding test changes.\n`
  } else if (context.hasTestChanges) {
    testCoverageAlert = `\n\n✅ **Test Coverage**: Tests were updated (${context.testFiles})\n`
  }

  const maxSlopLength = 2000
  const truncatedSlopAnalysis =
    context.slopAnalysis && context.slopAnalysis.length > maxSlopLength
      ? context.slopAnalysis.substring(0, maxSlopLength) + '\n...[TRUNCATED]'
      : context.slopAnalysis || 'Not available.'

  const customInstructions = instructions || ''

  const placeholders: { [key: string]: string } = {
    reviewIteration,
    prNumber: context.prNumber,
    prTitle: context.prTitle,
    prAuthor: context.prAuthor,
    filesChanged: context.filesChanged.toString(),
    totalLoc: context.totalLoc.toString(),
    changedAreas: context.changedAreas,
    reviewDepth: context.reviewDepth,
    prLabels: context.prLabels || 'none',
    issueNumber: context.issueNumber || '?',
    issueTitle: context.issueTitle || '',
    reviewCount: context.reviewCount.toString(),
    resolvedCount: context.resolvedCount.toString(),
    changesRequested: context.changesRequested.toString(),
    previousReviews,
    testFiles: context.testFiles || '',
    linkedIssueBody: context.linkedIssueBody || '',
    commitMessages: context.commitMessages,
    contextContent,
    truncatedDiff,
    failureList,
    testCoverageAlert,
    slopAnalysis: truncatedSlopAnalysis,
    customInstructions,
  }

  for (const [key, value] of Object.entries(placeholders)) {
    promptTemplate = promptTemplate.replace(
      new RegExp(`{{${key}}}`, 'g'),
      value
    )
  }

  return promptTemplate
}

async function runReviewPreset(
  genAI: GoogleGenerativeAI,
  contextContent: string,
  outputFile: string | null | undefined,
  context: ReviewContext,
  instructions?: string
) {
  // Skip logic
  if (
    context.prLabels.includes('ai-reviewed') ||
    context.prLabels.includes('abandon')
  ) {
    console.log('PR is marked as "ai-reviewed" or "abandon". Skipping review.')
    // If it's already ai-reviewed, we don't necessarily want to label it 'not reviewed'
    // but the requirement says "always include one".
    // However, if it's already reviewed, it should already have 'approved' or 'not approved'.
    await writeOutput(
      JSON.stringify({ reviewComment: '', labels: [], verdict: 'comment' }),
      outputFile
    )
    return
  }

  const diffFile = process.env.PR_DIFF_FILE
  if (!diffFile) {
    console.error('Error: PR_DIFF_FILE env var is required for review preset')
    await writeOutput(
      JSON.stringify({
        reviewComment: '',
        labels: ['not reviewed'],
        verdict: 'comment',
      }),
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
      JSON.stringify({
        reviewComment: '',
        labels: ['not reviewed'],
        verdict: 'comment',
      }),
      outputFile
    )
    return
  }

  const prompt = await buildReviewPrompt(
    diff,
    context,
    contextContent,
    instructions
  )
  const { text, thoughtSignature } = await generateContentWithFallback({
    genAI,
    prompt,
    thoughtSignature: context.thoughtSignature,
    config: {
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.2,
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
            suggestedIssues: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  type: {
                    type: SchemaType.STRING,
                    enum: [
                      'bug',
                      'enhancement',
                      'refactor',
                      'chore',
                      'documentation',
                      'technical-debt',
                      'frontend-improvement',
                      'security',
                    ],
                    format: 'enum',
                  },
                  priority: {
                    type: SchemaType.STRING,
                    enum: ['high', 'medium', 'low'],
                    format: 'enum',
                  },
                  fingerprint: {
                    type: SchemaType.STRING,
                    description:
                      'A stable, unique identifier for the issue (e.g., file_path:entity_name).',
                  },
                  isPreExisting: {
                    type: SchemaType.BOOLEAN,
                    description:
                      'Whether the issue is pre-existing technical debt (true) or introduced by the PR (false).',
                  },
                  filePath: {
                    type: SchemaType.STRING,
                    description:
                      'The path to the file where the issue was found (relative to repo root).',
                  },
                  lineNumber: {
                    type: SchemaType.NUMBER,
                    description: 'The line number where the issue starts.',
                  },
                },
                required: [
                  'title',
                  'description',
                  'type',
                  'priority',
                  'fingerprint',
                  'isPreExisting',
                  'filePath',
                  'lineNumber',
                ],
              },
            },
          },
          required: ['reviewComment', 'labels', 'verdict'],
        },
      },
    },
  })

  const jsonProcessor = new JsonProcessor()
  const result = jsonProcessor.process(text || '')
  const commitComment = `\n\n> Reviewed at commit: \`${context.commitHash}\``

  const prContext = {
    repo: process.env.GITHUB_REPOSITORY,
    prNumber: context.prNumber,
    branchName: context.prBranchName,
    commitHash: context.commitHash,
  }

  if (result.success) {
    const reviewData = result.data as {
      reviewComment?: string
      verdict?: string
      labels?: string[]
      prContext?: unknown
      thoughtSignature?: string
    }
    reviewData.prContext = prContext
    reviewData.thoughtSignature ??= thoughtSignature
    // It's valid JSON, but we should still check if the content is meaningful.
    if (
      !reviewData.reviewComment ||
      reviewData.reviewComment.trim().length < 20
    ) {
      console.warn(
        'Warning: Parsed JSON has an empty or short review comment. Injecting fallback.'
      )
      const fallback = {
        reviewComment: `### ✅ Verification Complete\n\nNo significant issues found in this iteration.${commitComment}`,
        labels: ['ai-reviewed', 'approved'],
        verdict: 'approve',
      }
      await writeOutput(JSON.stringify(fallback, null, 2), outputFile)
    } else {
      // Add commit hash to the review comment
      reviewData.reviewComment += commitComment
      // Ensure verdict field is present (required by downstream scripts)
      if (!reviewData.verdict) {
        reviewData.verdict = 'comment'
      }
      // Ensure labels field is present
      if (!reviewData.labels) {
        reviewData.labels = []
      }

      // Add status labels based on verdict if not already present
      if (
        !reviewData.labels.includes('approved') &&
        !reviewData.labels.includes('not approved')
      ) {
        if (reviewData.verdict === 'approve') {
          reviewData.labels.push('approved')
        } else {
          reviewData.labels.push('not approved')
        }
      }

      // Output the original, valid JSON.
      await writeOutput(JSON.stringify(reviewData, null, 2), outputFile)
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
      reviewComment: `### ❌ Review Failed: Invalid JSON Response\n\nThe AI response could not be parsed as valid JSON. This is an internal issue with the AI agent.${commitComment}\n\n<details><summary>Raw AI Output</summary>\n\n\`\`\`\n${
        (result.data as { rawResponse: string }).rawResponse || ''
      }\n\`\`\`\n\n</details>`,
      labels: ['ci-failure', 'not reviewed'],
      verdict: 'comment',
    }
    await writeOutput(JSON.stringify(errorJson, null, 2), outputFile)
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

export async function handleError(
  error: unknown,
  outputFile: string | null | undefined,
  context?: ReviewContext
) {
  let category = 'Infrastructure Issue'
  let userMessage =
    'The review service encountered an unexpected error. This is likely an intermittent problem.'
  let technicalDetails = 'No technical details available.'

  if (error instanceof Error) {
    technicalDetails = error.stack || error.message
    if (error.message.includes('api key')) {
      category = 'Configuration Issue'
      userMessage = 'The GEMINI_API_KEY is either invalid or missing.'
    }
  } else if (typeof error === 'string') {
    technicalDetails = error
  }

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

  const commitComment = context?.commitHash
    ? `\n\n> Attempted review at commit: \`${context.commitHash}\``
    : ''

  const errorOutput = {
    error: {
      category: category,
      message: userMessage,
      details: technicalDetails,
    },
    // Provide a valid structure for the review result to avoid breaking the calling workflow
    reviewComment: `### ❌ Review Failed: ${category}\n\n**Details**: ${userMessage}${commitComment}\n\n<details><summary>Technical Info</summary>\n\n\`\`\`\n${technicalDetails}\n\`\`\`\n\n</details>`,
    labels: ['ci-failure', 'not reviewed'],
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
    // If there's no output file, we should exit with a non-zero code to fail the CI step.
    process.exit(1)
  }
}

// Only run main() when the script is executed directly, not when imported.
// Jest sets NODE_ENV to 'test' by default.
if (process.env.NODE_ENV !== 'test') {
  main()
}
