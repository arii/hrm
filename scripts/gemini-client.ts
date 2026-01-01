import {
  GoogleGenerativeAI,
  SchemaType,
  GoogleGenerativeAIError,
  GenerateContentRequest,
  GenerativeModel,
} from '@google/generative-ai'
import {
  GoogleAICacheManager,
  GoogleAIFileManager,
} from '@google/generative-ai/server'
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
const useCache = args.includes('--use-cache')

// Recommended fallbacks - 2.0 Flash is preferred for caching efficiency
const defaultFallbacks = [
  'gemini-2.0-flash-exp', // Supports caching
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
]

export function getModelFallbacks(): string[] {
  const envFallbacks = process.env.GEMINI_MODEL_FALLBACKS
  if (!envFallbacks?.trim()) return defaultFallbacks

  const userFallbacks = envFallbacks
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m.startsWith('gemini-'))
  return userFallbacks.length > 0 ? userFallbacks : defaultFallbacks
}

const MODEL_FALLBACKS = getModelFallbacks()

// --- Caching Logic ---

async function createCacheForContext(
  apiKey: string,
  files: string[],
  tag: string
) {
  const fileManager = new GoogleAIFileManager(apiKey)
  const cacheManager = new GoogleAICacheManager(apiKey)

  console.log(`📦 [Cache] Processing ${files.length} context files...`)

  // 1. Upload files
  const uploadPromises = files
    .filter((f) => f.trim().length > 0)
    .map(async (file) => {
      try {
        const filePath = path.resolve(process.cwd(), file.trim())
        const uploadResult = await fileManager.uploadFile(filePath, {
          mimeType: 'text/plain',
          displayName: path.basename(filePath),
        })
        return {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        }
      } catch (e) {
        console.warn(
          `⚠️ [Cache] Failed to upload ${file}: ${(e as Error).message}`
        )
        return null
      }
    })

  const uploadedFiles = (await Promise.all(uploadPromises)).filter(
    (f) => f !== null
  ) as { fileUri: string; mimeType: string }[]

  if (uploadedFiles.length === 0) {
    console.warn(
      '⚠️ [Cache] No files were successfully uploaded. Aborting cache creation.'
    )
    throw new Error('No files were successfully uploaded for caching.')
  }

  // 2. Create Cache (TTL configurable in seconds)
  const primaryModel = MODEL_FALLBACKS[0]
  const ttlSecondsEnv = process.env.GEMINI_CACHE_TTL_SECONDS
  const ttlSeconds =
    ttlSecondsEnv && !isNaN(parseInt(ttlSecondsEnv, 10))
      ? parseInt(ttlSecondsEnv, 10)
      : 3600

  console.log(
    `💾 [Cache] Creating cache for model ${primaryModel} with TTL of ${ttlSeconds} seconds...`
  )

  const cacheResult = await cacheManager.create({
    model: primaryModel,
    displayName: `CI-${tag}-${Date.now()}`,
    ttlSeconds: ttlSeconds,
    contents: [
      {
        role: 'user',
        parts: uploadedFiles.map((fd) => ({ fileData: fd })),
      },
    ],
  })

  console.log(`✅ [Cache] Active: ${cacheResult.name}`)
  return cacheResult
}

// --- Existing Processors ---

export class JsonProcessor {
  private extractJsonBlock(text: string): string | null {
    const match = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text)
    return match && match[1] ? match[1] : null
  }

  public process(text: string): { success: boolean; data: any } {
    try {
      return { success: true, data: JSON.parse(text) }
    } catch {
      const jsonBlock = this.extractJsonBlock(text)
      if (jsonBlock) {
        try {
          return { success: true, data: JSON.parse(jsonBlock) }
        } catch (e) {
          return {
            success: false,
            data: {
              error: 'JSON Parse Error',
              message: 'Extracted block invalid',
              rawResponse: text,
            },
          }
        }
      }
      return {
        success: false,
        data: {
          error: 'JSON Parse Error',
          message: 'No JSON found',
          rawResponse: text,
        },
      }
    }
  }
}

export function cleanJsonOutput(text: string): string {
  if (!text) return ''
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = codeBlockRegex.exec(text)
  if (match && match[1] !== undefined) {
    return match[1].trim()
  }
  return text.trim()
}

// --- Main Execution ---

export async function main() {
  let reviewContext: ReviewContext | undefined
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY environment variable is not set.')
      process.exit(1)
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    let cachedModel: { model: GenerativeModel; name: string } | null = null
    let contextContent = ''

    // 1. Attempt Caching Strategy if requested
    if (useCache && contextFiles.length > 0) {
      try {
        const cache = await createCacheForContext(
          apiKey,
          contextFiles,
          preset || 'task'
        )
        cachedModel = {
          model: genAI.getGenerativeModelFromCachedContent(cache),
          name: cache.name || '',
        }
      } catch (error) {
        console.warn(
          `⚠️ [Cache] Failed to initialize cache. Falling back to standard text context. Error: ${
            (error as Error).message
          }`
        )
        cachedModel = null
      }
    }

    // 2. Prepare Text Context (Fallback or standard mode)
    if (!cachedModel) {
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
          contextContent += `\n\n--- Context File: ${trimmedFile} (MISSING/ERROR) ---\n`
        }
      }
    }

    if (preset === 'review') {
      reviewContext = getReviewContextFromEnv()
      await runReviewPreset(genAI, contextContent, outputFile, cachedModel)
    } else if (preset === 'resolve-conflict') {
      if (!contextFile) {
        console.error(
          'Error: --context-file is required for resolve-conflict preset'
        )
        process.exit(1)
      }
      await runConflictResolution(genAI, contextFile, outputFile)
    } else {
      // Generic Task
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
        console.error('Error: Task description is missing.')
        process.exit(1)
      }
      await runGenericTask(
        genAI,
        finalTask,
        contextContent,
        outputFile,
        cachedModel
      )
    }
  } catch (error) {
    // Centralized error handling.
    await handleError(error, outputFile, reviewContext)
  }
}

// --- Generation Functions ---

export async function generateContentWithFallback(
  genAI: GoogleGenerativeAI,
  cachePrompt: string,
  fullPrompt: string,
  config?: Omit<GenerateContentRequest, 'contents'>,
  cachedModel?: { model: GenerativeModel; name: string } | null
) {
  // Priority 1: Use Cached Model if available
  if (cachedModel) {
    try {
      if (cachedModel.name) {
        console.log(
          `🚀 Using Cached Model for generation from cache: ${cachedModel.name}...`
        )
      }
      const result = await cachedModel.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: cachePrompt }] }],
        ...config,
      })
      return result.response.text()
    } catch (error: any) {
      console.warn(
        `⚠️ Cached model failed (${error.message}). Falling back to standard text-based generation.`
      )
      // Fall through to standard loop, but now using the fullPrompt
    }
  }

  // Priority 2: Standard Fallback Loop
  let lastError
  for (const modelName of MODEL_FALLBACKS) {
    console.log(`Attempting to use model: ${modelName}...`)
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        ...config,
      })
      console.log(`Successfully generated content using ${modelName}.`)
      return result.response.text()
    } catch (error: any) {
      lastError = error
      const errorMessage = error.message || ''
      const errorStatus = (error as any).status

      const isNotFound = errorMessage.includes('404') || errorStatus === 404
      const isBadRequest = errorMessage.includes('400') || errorStatus === 400
      const isRateLimited = errorMessage.includes('429') || errorStatus === 429
      const isOverloaded = errorStatus === 503

      if (isNotFound || isBadRequest || isRateLimited || isOverloaded) {
        let reason = 'Unknown Error'
        if (isRateLimited) reason = 'Rate Limited'
        else if (isOverloaded) reason = 'Overloaded'
        else if (isNotFound) reason = 'Not Found'
        else if (isBadRequest) reason = 'Invalid Request'
        console.warn(
          `Model ${modelName} failed (${reason}). Trying next model...`
        )
        continue
      }
      throw error
    }
  }
  throw new Error(`All models failed. Last error: ${lastError?.message}`)
}

async function runGenericTask(
  genAI: GoogleGenerativeAI,
  task: string,
  contextContent: string,
  outputFile: string | null | undefined,
  cachedModel?: { model: GenerativeModel; name: string } | null
) {
  const cachePrompt = `Task: ${task}`
  const fullPrompt = `
You are an AI assistant helping with a software project.
Please use the provided context files to inform your response.

${contextContent}

--- Task ---
${task}
`

  try {
    const text = await generateContentWithFallback(
      genAI,
      cachePrompt,
      fullPrompt,
      {},
      cachedModel
    )
    await writeOutput(text, outputFile)
  } catch (error) {
    await handleError(error, outputFile)
  }
}

// --- Review Preset Functions ---

export interface FailedCheck {
  name: string
  conclusion: string
  detailsUrl: string
  logSnippet?: string
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
}

function parseFailedChecks(jsonStr: string | undefined): FailedCheck[] {
  if (!jsonStr) return []
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      console.warn('Warning: FAILED_CHECKS_JSON is not an array.')
      return []
    }
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
    prBranchName: process.env.PR_BRANCH_NAME || '',
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
    commitHash: process.env.COMMIT_HASH || '',
    hasTestChanges: process.env.HAS_TEST_CHANGES === 'true',
    missingTests: process.env.MISSING_TESTS === 'true',
    testFiles: process.env.TEST_FILES,
    failedChecks,
  }
}

export async function buildReviewPrompt(
  diff: string,
  context: ReviewContext,
  contextContent: string
): Promise<string> {
  const isReReview = context.reviewCount > 0
  const hasFailures = context.failedChecks && context.failedChecks.length > 0

  const templatePath = hasFailures
    ? 'prompts/fix-mode.md'
    : 'prompts/standard-review.md'
  let promptTemplate = await readFile(
    path.resolve(process.cwd(), templatePath),
    'utf-8'
  )

  const reviewIteration = isReReview
    ? `Re-Review #${context.reviewCount + 1}`
    : 'Initial Review'

  const maxDiffLength = 60000
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
      return `- **${c.name}** (${c.conclusion}) ${
        truncatedLog ? `\n  Error: \`\`\`\n${truncatedLog}\n\`\`\`` : ''
      }`
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
  cachedModel?: { model: GenerativeModel; name: string } | null
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
    await writeOutput(JSON.stringify({ reviewComment: '', labels: [] }), outputFile)
    return
  }

  const diffFile = process.env.PR_DIFF_FILE
  if (!diffFile) {
    console.error('Error: PR_DIFF_FILE env var is required for review preset')
    await writeOutput(JSON.stringify({ reviewComment: '', labels: [] }), outputFile)
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
    await writeOutput(JSON.stringify({ reviewComment: '', labels: [] }), outputFile)
    return
  }

  const fullPrompt = await buildReviewPrompt(
    diff,
    context,
    cachedModel ? '' : contextContent
  )

  const cachePrompt = await buildReviewPrompt(diff, context, '')

  try {
    const text = await generateContentWithFallback(
      genAI,
      cachePrompt,
      fullPrompt,
      {
        generationConfig: {
          maxOutputTokens: 8192,
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
      },
      cachedModel
    )

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
        prContext?: unknown
      }
      reviewData.prContext = prContext
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
          labels: ['ready-for-approval'],
          verdict: 'approve',
          prContext,
        }
        await writeOutput(JSON.stringify(fallback, null, 2), outputFile)
      } else {
        // Add commit hash to the review comment
        reviewData.reviewComment += commitComment
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
        labels: ['review-failed'],
        verdict: 'comment',
        prContext,
      }
      await writeOutput(JSON.stringify(errorJson, null, 2), outputFile)
    }
  } catch (error) {
    await handleError(error, outputFile, context)
  }
}

// --- Helper Functions ---

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
    reviewComment: `### ❌ Review Failed: ${category}\n\n**Details**: ${userMessage}${commitComment}\n\n<details><summary>Technical Info</summary>\n\n\`\`\`\n${technicalDetails}\n\`\`\`\n\n</details>`,
    labels: ['review-failed'],
    verdict: 'comment',
  }

  console.error(
    'Error during content generation:',
    JSON.stringify(errorOutput, null, 2)
  )

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

// Only run main() when the script is executed directly.
if (process.env.NODE_ENV !== 'test') {
  main()
}
