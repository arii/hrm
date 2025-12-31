import { execSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { z } from 'zod'

// --- Zod Schemas for Validation ---

const SuggestedIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(['technical-debt', 'frontend-improvement', 'security', 'bug']),
  priority: z.enum(['high', 'medium', 'low']),
})

const ReviewResultSchema = z.object({
  reviewComment: z.string(),
  labels: z.array(z.string()),
  verdict: z.string(),
  suggestedIssues: z.array(SuggestedIssueSchema).optional(),
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

// --- Configuration ---

export const CONFIG = {
  resultFile: 'review_result.json',
  prNumber: process.env.PR_NUMBER,
  repo: process.env.GITHUB_REPOSITORY,
}

// --- GitHub CLI Wrapper ---

export class GitHubClient {
  private execute(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim()
    } catch (error: unknown) {
      const stderr =
        error instanceof Error && 'stderr' in error
          ? String(error.stderr)
          : 'Unknown error'
      throw new Error(`GitHub CLI Error: ${stderr}`)
    }
  }

  getOpenIssues(labelFilter?: string): ExistingIssue[] {
    console.log('🔍 Fetching existing issues to prevent duplicates...')
    let cmd = `gh issue list --state open --json number,title,state,body --limit 100`
    if (labelFilter) {
      cmd += ` --label "${labelFilter}"`
    }

    let output = ''
    try {
      output = this.execute(cmd)
      const parsed = JSON.parse(output)
      const validationResult = ExistingIssuesSchema.safeParse(parsed)
      if (!validationResult.success) {
        console.warn(`Warning: Invalid format for existing issues.`, validationResult.error)
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

  createIssue(issue: SuggestedIssue, prNumber: string): void {
    const labels = [
      'bot-generated',
      'triage-needed',
      `type-${issue.type}`,
      `priority-${issue.priority}`,
    ].join(',')

    const footer = `\n\n---\n*Detected by Gemini Code Review in PR #${prNumber}*`
    const body = `${issue.description}${footer}`
    const title = issue.title

    console.log(`🚀 Creating issue: "${title}"...`)

    const tempDir = os.tmpdir()
    const titleFile = path.join(tempDir, `issue_title_${Date.now()}.txt`)
    const bodyFile = path.join(tempDir, `issue_body_${Date.now()}.md`)

    try {
      writeFileSync(titleFile, title, 'utf-8')
      writeFileSync(bodyFile, body, 'utf-8')

      const cmd = `gh issue create --title-file "${titleFile}" --body-file "${bodyFile}" --label "${labels}"`
      const url = this.execute(cmd)
      console.log(`✅ Issue created: ${url}`)
    } finally {
      unlinkSync(titleFile)
      unlinkSync(bodyFile)
    }
  }
}

// --- Deduplication ---

function getIssueSignature(title: string, description: string): string {
  const content = `${title.trim()}${description.trim()}`
  return crypto.createHash('sha256').update(content).digest('hex')
}

export function isDuplicate(
  newIssue: SuggestedIssue,
  existingIssues: ExistingIssue[]
): boolean {
  const newSignature = getIssueSignature(newIssue.title, newIssue.description)
  for (const existing of existingIssues) {
    // Strip the footer from the existing issue body before generating the signature
    const existingDescription = existing.body.split('\n\n---')[0] || ''
    const existingSignature = getIssueSignature(existing.title, existingDescription)
    if (newSignature === existingSignature) {
      return true
    }
  }
  return false
}

// --- Main Execution ---

export async function main() {
  if (!CONFIG.prNumber) {
    console.error('❌ Error: PR_NUMBER environment variable is missing.')
    process.exit(1)
  }

  let result: ReviewResult
  try {
    const content = readFileSync(
      path.resolve(process.cwd(), CONFIG.resultFile),
      'utf-8'
    )
    const parsedJson = JSON.parse(content)
    const validationResult = ReviewResultSchema.safeParse(parsedJson)
    if (!validationResult.success) {
      console.error(`❌ Error validating ${CONFIG.resultFile}:`, validationResult.error)
      process.exit(1)
      return // Explicit return for clarity
    }
    result = validationResult.data
  } catch (e) {
    console.error(
      `❌ Error reading or parsing ${CONFIG.resultFile}: ${(e as Error).message}`
    )
    process.exit(1)
    return // Explicit return for clarity
  }

  if (!result.suggestedIssues || result.suggestedIssues.length === 0) {
    console.log('✨ No suggested issues found in the review result.')
    process.exit(0)
  }

  const client = new GitHubClient()

  const existingIssues = client.getOpenIssues('bot-generated')

  let createdCount = 0
  let skippedCount = 0

  for (const issue of result.suggestedIssues) {
    if (isDuplicate(issue, existingIssues)) {
      console.log(`⏭️  Skipping duplicate: "${issue.title}"`)
      skippedCount++
      continue
    }

    client.createIssue(issue, CONFIG.prNumber)
    createdCount++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Created: ${createdCount}`)
  console.log(`Skipped (Duplicate): ${skippedCount}`)
}

// istanbul ignore next
if (require.main === module) {
  main().catch((err) => {
    console.error('Unhandled error:', err)
    process.exit(1)
  })
}
