import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { z } from 'zod'

// --- Constants ---
const DEFAULT_MIN_DESCRIPTION_LENGTH = 50
export const FINGERPRINT_REGEX = /<!-- fingerprint: (.*) -->/

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load config once at module level for efficiency
const config = (() => {
  try {
    const CONFIG_PATH = path.join(__dirname, 'issue-config.json')
    const content = readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    // During tests or if file is missing, fallback to empty config
    return {}
  }
})()

const MIN_DESCRIPTION_LENGTH =
  config.minDescriptionLength ?? DEFAULT_MIN_DESCRIPTION_LENGTH

// --- Label Configuration ---

const LABEL_CONFIG: { [key: string]: { color: string; description: string } } =
  {
    'bot-generated': {
      color: 'cfd3d7',
      description: 'Issue generated automatically by a bot.',
    },
    'triage-needed': {
      color: 'fef2c0',
      description: 'This issue needs to be reviewed and prioritized.',
    },
    refactor: {
      color: 'bfdadc',
      description: 'Restructuring code without changing behavior.',
    },
    enhancement: {
      color: 'a2eeef',
      description:
        'New feature, request, or improvement to existing functionality.',
    },
    bug: {
      color: 'd73a4a',
      description: "Something isn't working.",
    },
    chore: {
      color: 'eeeeee',
      description:
        'Internal maintenance, dependency updates, or build process changes.',
    },
    documentation: {
      color: '0075ca',
      description: 'Improvements or additions to documentation.',
    },
    'technical-debt': {
      color: '5319e7',
      description: 'Code that needs refactoring or improvement.',
    },
    'frontend-improvement': {
      color: 'a2eeef',
      description: 'Improvements to the user interface.',
    },
    security: {
      color: 'd73a4a',
      description: 'Security vulnerability or improvement.',
    },
    'priority:high': { color: 'd73a4a', description: 'High priority issue.' },
    'priority:medium': {
      color: 'fbca04',
      description: 'Medium priority issue.',
    },
    'priority:low': { color: '0e8a16', description: 'Low priority issue.' },
  }

// --- Zod Schemas for Validation ---

const SuggestedIssueSchema = z.object({
  title: z.string(),
  description: z
    .string()
    .min(
      MIN_DESCRIPTION_LENGTH,
      `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`
    ),
  type: z.enum([
    'bug',
    'enhancement',
    'refactor',
    'chore',
    'documentation',
    'technical-debt',
    'frontend-improvement',
    'security',
  ]),
  priority: z.enum(['high', 'medium', 'low']),
  fingerprint: z.string(),
  isPreExisting: z.boolean(),
  filePath: z.string(),
  lineNumber: z.number(),
})

const PRContextSchema = z.object({
  repo: z.string().optional(),
  prNumber: z.string().optional(),
  branchName: z.string().optional(),
  commitHash: z.string().optional(),
})

const ReviewResultSchema = z.object({
  reviewComment: z.string(),
  labels: z.array(z.string()),
  verdict: z.string(),
  suggestedIssues: z.array(SuggestedIssueSchema).optional(),
  prContext: PRContextSchema.optional(),
})

const ExistingIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.string(),
  body: z.string(),
})

const ExistingIssuesSchema = z.array(ExistingIssueSchema)

// --- Types inferred from Zod ---

export type SuggestedIssue = z.infer<typeof SuggestedIssueSchema>
export type ReviewResult = z.infer<typeof ReviewResultSchema>
export type ExistingIssue = z.infer<typeof ExistingIssueSchema>

export interface PreparedExistingIssue extends ExistingIssue {
  titleTokens: Set<string>
}

// --- GitHub Client Abstraction ---

export interface IGitHubClient {
  getRecentIssues(labelFilter?: string): ExistingIssue[]
  createIssue(
    issue: SuggestedIssue,
    context: z.infer<typeof PRContextSchema>
  ): void
}

export class GitHubClient implements IGitHubClient {
  private labelsEnsured = false

  private execute(command: string, args: string[]): string {
    const result = spawnSync(command, args, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    if (result.status !== 0) {
      throw new Error(`GitHub CLI Error: ${result.stderr || 'Unknown error'}`)
    }

    return result.stdout.trim()
  }

  getRecentIssues(labelFilter?: string): ExistingIssue[] {
    console.log(
      '🔍 Fetching recent issues (open and closed) to prevent duplicates...'
    )

    const args = [
      'issue',
      'list',
      '--state',
      'all',
      '--json',
      'number,title,state,body',
      '--limit',
      '1000',
    ]
    if (labelFilter) {
      args.push('--label', labelFilter)
    }

    let output = ''
    try {
      output = this.execute('gh', args)
      const parsed = JSON.parse(output)
      const validationResult = ExistingIssuesSchema.safeParse(parsed)
      if (!validationResult.success) {
        console.warn(
          `Warning: Invalid format for existing issues.`,
          validationResult.error
        )
        return []
      }
      return validationResult.data
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      console.warn(
        `Warning: Failed to fetch or parse existing issues. Duplicate detection might fail.
        Error: ${errorMessage}
        Raw GH CLI output:
        ${output}`
      )
      return []
    }
  }

  createIssue(
    issue: SuggestedIssue,
    context: z.infer<typeof PRContextSchema>
  ): void {
    const requiredLabels = [
      'bot-generated',
      'triage-needed',
      issue.type,
      `priority:${issue.priority}`,
    ]
    this.ensureLabelsExist(requiredLabels)
    const labels = requiredLabels.join(',')

    // PR Link Construction
    const prLink = context.repo
      ? `[PR #${context.prNumber}](https://github.com/${context.repo}/pull/${context.prNumber})`
      : `PR #${context.prNumber}`

    const commitLink =
      context.repo && context.commitHash
        ? `[\`${context.commitHash.substring(0, 7)}\`](https://github.com/${
            context.repo
          }/pull/${context.prNumber}/commits/${context.commitHash})`
        : context.commitHash
          ? `\`${context.commitHash.substring(0, 7)}\``
          : 'N/A'

    const branchInfo = context.branchName ? `\`${context.branchName}\`` : 'N/A'

    const footer = `
---
*Generated by Gemini Code Review*
- **Source:** ${prLink}
- **Branch:** ${branchInfo}
- **Commit:** ${commitLink}`

    const fingerprintMarker = issue.fingerprint
      ? `\n<!-- fingerprint: ${issue.fingerprint} -->`
      : ''
    const body = `${issue.description}${footer}${fingerprintMarker}`
    const title = issue.title

    console.log(`🚀 Creating issue: "${title}"...`)

    const tempDir = os.tmpdir()
    const bodyFile = path.join(tempDir, `issue_body_${Date.now()}.md`)

    try {
      writeFileSync(bodyFile, body, 'utf-8')
      const args = [
        'issue',
        'create',
        '--title',
        title,
        '--body-file',
        bodyFile,
        '--label',
        labels,
      ]
      const url = this.execute('gh', args)
      console.log(`✅ Issue created: ${url}`)
    } finally {
      unlinkSync(bodyFile)
    }
  }

  private ensureLabelsExist(requiredLabels: string[]): void {
    if (this.labelsEnsured) {
      return
    }

    console.log('🛡️ Verifying required labels exist...')
    const existingLabelsRaw = this.execute('gh', [
      'label',
      'list',
      '--json',
      'name',
    ])
    const existingLabels = JSON.parse(existingLabelsRaw).map(
      (label: { name: string }) => label.name
    )
    const missingLabels = requiredLabels.filter(
      (label) => !existingLabels.includes(label)
    )

    if (missingLabels.length > 0) {
      console.log(
        `✨ Found missing labels: ${missingLabels.join(', ')}. Creating them...`
      )
      for (const label of missingLabels) {
        const config = LABEL_CONFIG[label]
        if (config) {
          try {
            this.execute('gh', [
              'label',
              'create',
              label,
              '--color',
              config.color,
              '--description',
              config.description,
            ])
            console.log(`   - Created label: "${label}"`)
          } catch (e) {
            // Ignore errors if the label already exists (race condition)
            if (e instanceof Error && e.message.includes('already exists')) {
              console.log(
                `   - Label "${label}" already exists (likely created by a parallel process).`
              )
            } else {
              throw e // Re-throw other errors
            }
          }
        }
      }
    } else {
      console.log('✅ All required labels are present.')
    }
    this.labelsEnsured = true
  }
}

// --- Deduplication ---

// Helper function for fuzzy matching
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
}

/**
 * Calculates the Jaccard similarity between two sets of tokens.
 * A value of 1 indicates identical sets, while 0 indicates no overlap.
 */
export function calculateJaccardSimilarity(
  words1: Set<string>,
  words2: Set<string>
): number {
  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter((x) => words2.has(x)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

function getIssueSignature(title: string, description: string): string {
  const content = `${title.trim()}${description.trim()}`
  return crypto.createHash('sha256').update(content).digest('hex')
}

const GENERIC_TITLES = [
  'refactor code',
  'improve code quality',
  'fix technical debt',
  'technical debt identified',
  'clean up code',
  'optimize performance',
  'add documentation',
  'improve test coverage',
  'enhance readability',
]

export interface QualityResult {
  isLowQuality: boolean
  reason?: string
}

export function checkIssueQuality(
  issue: SuggestedIssue,
  slopPattern: RegExp | null
): QualityResult {
  // 1. Check description length
  if (issue.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return {
      isLowQuality: true,
      reason: `Description too short (${issue.description.trim().length} chars, required ${MIN_DESCRIPTION_LENGTH})`,
    }
  }

  // 2. Check for generic titles
  const normalizedTitle = issue.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
  if (GENERIC_TITLES.includes(normalizedTitle)) {
    return { isLowQuality: true, reason: 'Generic title' }
  }

  // 3. Check for "AI slop" patterns
  if (slopPattern) {
    const combinedText = `${issue.title} ${issue.description}`
    // Ensure we use global and case-insensitive flags for counting matches
    const globalSlopRegex = new RegExp(slopPattern.source, 'gi')
    const matches = combinedText.match(globalSlopRegex) || []
    const uniqueMatches = [...new Set(matches.map((m) => m.toLowerCase()))]

    if (uniqueMatches.length >= 3) {
      return {
        isLowQuality: true,
        reason: `AI slop detected (${uniqueMatches.join(', ')})`,
      }
    }
  }

  return { isLowQuality: false }
}

export function isLowQualityIssue(
  issue: SuggestedIssue,
  slopPattern: RegExp | null
): boolean {
  return checkIssueQuality(issue, slopPattern).isLowQuality
}

export interface DuplicateResult {
  isDuplicate: boolean
  reason?: string
  matchingIssueNumber?: number
}

export function checkDuplicate(
  newIssue: SuggestedIssue,
  existingIssues: PreparedExistingIssue[]
): DuplicateResult {
  const newSignature = getIssueSignature(newIssue.title, newIssue.description)
  const newIssueTokens = tokenize(newIssue.title)

  for (const existing of existingIssues) {
    // 1. Check for exact content match (legacy)
    const existingDescription = existing.body.split('\n\n---')[0] || ''
    const existingSignature = getIssueSignature(
      existing.title,
      existingDescription
    )
    if (newSignature === existingSignature) {
      return {
        isDuplicate: true,
        reason: 'Exact content match',
        matchingIssueNumber: existing.number,
      }
    }

    // 2. Check for fingerprint match
    const existingFingerprint = existing.body.match(FINGERPRINT_REGEX)?.[1]
    if (
      newIssue.fingerprint &&
      existingFingerprint &&
      newIssue.fingerprint === existingFingerprint
    ) {
      return {
        isDuplicate: true,
        reason: `Fingerprint match (${newIssue.fingerprint})`,
        matchingIssueNumber: existing.number,
      }
    }

    // 3. Check for fuzzy title match (Only against OPEN issues)
    if (existing.state.toUpperCase() === 'OPEN') {
      const titleSimilarity = calculateJaccardSimilarity(
        newIssueTokens,
        existing.titleTokens
      )
      if (titleSimilarity >= 0.85) {
        return {
          isDuplicate: true,
          reason: `Fuzzy title match (${Math.round(titleSimilarity * 100)}% similarity)`,
          matchingIssueNumber: existing.number,
        }
      }
    }
  }
  return { isDuplicate: false }
}

export function isDuplicate(
  newIssue: SuggestedIssue,
  existingIssues: PreparedExistingIssue[]
): boolean {
  return checkDuplicate(newIssue, existingIssues).isDuplicate
}

function verifyIsPreExisting(
  issue: SuggestedIssue,
  baseSha: string | undefined
): boolean {
  try {
    const range = `${issue.lineNumber},${issue.lineNumber}`
    // Use git blame to see if the line was modified since baseSha
    const result = spawnSync(
      'git',
      ['blame', '-L', range, '--porcelain', issue.filePath],
      { encoding: 'utf-8' }
    )

    if (result.status !== 0 || !result.stdout) return false

    const output = result.stdout.trim()
    if (!output) return false

    // The first line of porcelain output is the commit hash
    const commitHash = output.split('\n')[0]?.split(' ')[0]
    if (!commitHash) return false

    if (!baseSha) {
      console.warn(
        `Warning: BASE_SHA environment variable is missing. Cannot verify pre-existing status for ${issue.filePath}:${issue.lineNumber}. Assuming not pre-existing to be safe.`
      )
      return false
    }

    const isAncestor =
      spawnSync('git', ['merge-base', '--is-ancestor', commitHash, baseSha])
        .status === 0
    return isAncestor
  } catch (e) {
    console.warn(
      `Warning: Git command failed to verify pre-existing status for ${issue.filePath}:${issue.lineNumber}: ${e instanceof Error ? e.message : e}`
    )
    return false
  }
}

// --- Core Logic ---

export async function run(
  client: IGitHubClient,
  prNumber: string,
  reviewFilePath: string
) {
  if (!prNumber) {
    throw new Error('❌ Error: PR_NUMBER is missing.')
  }

  let result: ReviewResult
  try {
    const content = readFileSync(path.resolve(reviewFilePath), 'utf-8')
    const parsedJson = JSON.parse(content)
    const validationResult = ReviewResultSchema.safeParse(parsedJson)
    if (!validationResult.success) {
      throw new Error(
        `❌ Error validating ${reviewFilePath}: ${validationResult.error}`
      )
    }
    result = validationResult.data
  } catch (e) {
    throw new Error(
      `❌ Error reading or parsing ${reviewFilePath}: ${(e as Error).message}`
    )
  }

  const baseSha = process.env.BASE_SHA

  // Filter: ONLY create issues for items identified as pre-existing on the base branch
  const outOfScopeIssues = (result.suggestedIssues || []).filter((issue) => {
    if (issue.isPreExisting !== true) return false
    return verifyIsPreExisting(issue, baseSha)
  })

  if (outOfScopeIssues.length === 0) {
    console.log(
      '✨ No pre-existing base branch issues identified for extraction.'
    )
    return
  }

  const existingIssues = client.getRecentIssues('bot-generated')

  // Optimize: Pre-calculate tokens for existing issues to avoid re-tokenizing in the loop.
  const preparedExistingIssues: PreparedExistingIssue[] = existingIssues.map(
    (issue) => ({
      ...issue,
      titleTokens: tokenize(issue.title),
    })
  )

  // Read and compile the slop words from the file.
  let slopPattern: RegExp | null = null
  try {
    const slopWords = readFileSync(
      path.join(__dirname, '../ai_slop_words.txt'),
      'utf-8'
    )
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
    if (slopWords.length > 0) {
      const escapedWords = slopWords.map((w) =>
        w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      )
      const pattern = `\\b(?:${escapedWords.join('|')})\\b`
      slopPattern = new RegExp(pattern, 'i')
    }
  } catch (e) {
    console.warn('Could not read ai_slop_words.txt, skipping quality check.')
  }

  let createdCount = 0
  let skippedDuplicates = 0
  let skippedLowQuality = 0

  for (const issue of outOfScopeIssues) {
    const duplicate = checkDuplicate(issue, preparedExistingIssues)
    if (duplicate.isDuplicate) {
      console.log(
        `⏭️  Skipping duplicate: "${issue.title}" (${duplicate.reason} with #${duplicate.matchingIssueNumber})`
      )
      skippedDuplicates++
      continue
    }

    const quality = checkIssueQuality(issue, slopPattern)
    if (quality.isLowQuality) {
      console.log(
        `🗑️  Skipping low-quality issue: "${issue.title}" (${quality.reason})`
      )
      skippedLowQuality++
      continue
    }

    // Fallback context if not present in the review file
    const context = result.prContext ?? {
      repo: process.env.GITHUB_REPOSITORY,
      prNumber: prNumber,
    }

    client.createIssue(issue, context)
    createdCount++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Created: ${createdCount}`)
  console.log(`Skipped (Duplicate): ${skippedDuplicates}`)
  console.log(`Skipped (Low Quality): ${skippedLowQuality}`)
}

// --- Main Execution ---
