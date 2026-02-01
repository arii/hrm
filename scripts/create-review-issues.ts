import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { z } from 'zod'

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
    'type-technical-debt': {
      color: 'a2eeef',
      description: 'Technical debt that needs to be addressed.',
    },
    'type-frontend-improvement': {
      color: 'd4c5f9',
      description: 'Improvement to the user interface or user experience.',
    },
    'type-security': {
      color: 'd73a4a',
      description: 'Security vulnerability or concern.',
    },
    'type-bug': {
      color: 'd73a4a',
      description: 'A bug or unexpected behavior.',
    },
    'priority-high': { color: 'd73a4a', description: 'High priority issue.' },
    'priority-medium': {
      color: 'fbca04',
      description: 'Medium priority issue.',
    },
    'priority-low': { color: '0e8a16', description: 'Low priority issue.' },
  }

// --- Zod Schemas for Validation ---

const SuggestedIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(['technical-debt', 'frontend-improvement', 'security', 'bug']),
  priority: z.enum(['high', 'medium', 'low']),
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
      `type-${issue.type}`,
      `priority-${issue.priority}`,
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

    const body = `${issue.description}${footer}`
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

function getIssueSignature(title: string, description: string): string {
  const content = `${title.trim()}${description.trim()}`
  return crypto.createHash('sha256').update(content).digest('hex')
}

export function isLowQualityIssue(
  issue: SuggestedIssue,
  slopWords: string[]
): boolean {
  // Define a minimum description length to avoid trivial issues.
  const MIN_DESCRIPTION_LENGTH = 50

  if (issue.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return true
  }

  const combinedText = `${issue.title.toLowerCase()} ${issue.description.toLowerCase()}`

  // Check for the presence of "slop" words.
  for (const word of slopWords) {
    if (word.trim() === '') continue // Skip empty lines from wordlist
    // Use word boundaries to avoid matching parts of words.
    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`)
    if (regex.test(combinedText)) {
      return true
    }
  }

  return false
}

export function isDuplicate(
  newIssue: SuggestedIssue,
  existingIssues: ExistingIssue[]
): boolean {
  const newSignature = getIssueSignature(newIssue.title, newIssue.description)
  for (const existing of existingIssues) {
    // Strip the footer from the existing issue body before generating the signature
    const existingDescription = existing.body.split('\n\n---')[0] || ''
    const existingSignature = getIssueSignature(
      existing.title,
      existingDescription
    )
    if (newSignature === existingSignature) {
      return true
    }
  }
  return false
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
    const content = readFileSync(
      path.resolve(process.cwd(), reviewFilePath),
      'utf-8'
    )
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

  if (!result.suggestedIssues || result.suggestedIssues.length === 0) {
    console.log('✨ No suggested issues found in the review result.')
    return
  }

  const existingIssues = client.getRecentIssues('bot-generated')

  // Read the slop words from the file.
  let slopWords: string[] = []
  try {
    slopWords = readFileSync(
      path.resolve(process.cwd(), 'ai_slop_words.txt'),
      'utf-8'
    ).split('\n')
  } catch (e) {
    console.warn('Could not read ai_slop_words.txt, skipping quality check.')
  }

  let createdCount = 0
  let skippedDuplicates = 0
  let skippedLowQuality = 0

  for (const issue of result.suggestedIssues) {
    if (isDuplicate(issue, existingIssues)) {
      console.log(`⏭️  Skipping duplicate: "${issue.title}"`)
      skippedDuplicates++
      continue
    }

    if (isLowQualityIssue(issue, slopWords)) {
      console.log(`🗑️  Skipping low-quality issue: "${issue.title}"`)
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
