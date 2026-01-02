import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

// --- Types & Interfaces ---

export interface SuggestedIssue {
  title: string
  description: string
  type: 'technical-debt' | 'frontend-improvement' | 'security' | 'bug'
  priority: 'high' | 'medium' | 'low'
}

export interface ReviewResult {
  reviewComment: string
  labels: string[]
  verdict: string
  suggestedIssues?: SuggestedIssue[]
}

export interface ExistingIssue {
  number: number
  title: string
  state: string
}

// --- GitHub Client Abstraction ---

export interface IGitHubClient {
  getOpenIssues(labelFilter?: string): ExistingIssue[]
  createIssue(issue: SuggestedIssue, prNumber: string): void
}

export class GitHubClient implements IGitHubClient {
  private execute(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    } catch (error: any) {
      const stderr = error.stderr ? error.stderr.toString() : 'Unknown error'
      throw new Error(`GitHub CLI Error: ${stderr}`)
    }
  }

  getOpenIssues(labelFilter?: string): ExistingIssue[] {
    console.log('🔍 Fetching existing issues to prevent duplicates...')
    let cmd = `gh issue list --state open --json number,title,state --limit 100`
    if (labelFilter) {
      cmd += ` --label "${labelFilter}"`
    }

    try {
      const output = this.execute(cmd)
      return JSON.parse(output) as ExistingIssue[]
    } catch (e) {
      console.warn('Warning: Failed to fetch existing issues. Duplicate detection might fail.')
      return []
    }
  }

  createIssue(issue: SuggestedIssue, prNumber: string): void {
    const labels = [
      'bot-generated',
      'triage-needed',
      `type-${issue.type}`,
      `priority-${issue.priority}`
    ].join(',')

    const footer = `\n\n---\n*Detected by Gemini Code Review in PR #${prNumber}*`
    const body = `${issue.description}${footer}`

    console.log(`🚀 Creating issue: "${issue.title}"...`)

    const cmd = `gh issue create --title "${this.escapeShell(issue.title)}" --body "${this.escapeShell(body)}" --label "${labels}"`

    try {
      const url = this.execute(cmd)
      console.log(`✅ Issue created: ${url}`)
    } catch (e) {
      console.error(`❌ Failed to create issue: ${(e as Error).message}`)
    }
  }

  private escapeShell(str: string): string {
    return str.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
  }
}

// --- Core Logic ---

export async function run(client: IGitHubClient, prNumber: string, reviewFilePath: string) {
  if (!prNumber) {
    console.error('❌ Error: PR_NUMBER is missing.')
    return
  }

  let result: ReviewResult
  try {
    const content = readFileSync(path.resolve(process.cwd(), reviewFilePath), 'utf-8')
    result = JSON.parse(content) as ReviewResult
  } catch (e) {
    console.error(`❌ Error reading ${reviewFilePath}: ${(e as Error).message}`)
    return
  }

  if (!result.suggestedIssues || result.suggestedIssues.length === 0) {
    console.log('✨ No suggested issues found in the review result.')
    return
  }

  const existingIssues = client.getOpenIssues('bot-generated')
  const existingTitles = new Set(existingIssues.map(i => i.title))

  let createdCount = 0
  let skippedCount = 0

  for (const issue of result.suggestedIssues) {
    if (existingTitles.has(issue.title)) {
      console.log(`⏭️  Skipping duplicate: "${issue.title}"`)
      skippedCount++
      continue
    }

    client.createIssue(issue, prNumber)
    createdCount++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Created: ${createdCount}`)
  console.log(`Skipped: ${skippedCount}`)
}


// --- Main Execution ---

// istanbul ignore next
if (require.main === module) {
  const client = new GitHubClient()
  const prNumber = process.env.PR_NUMBER
  const reviewFile = 'review_result.json'

  run(client, prNumber || '', reviewFile).catch(err => {
    console.error('Unhandled error:', err)
    process.exit(1)
  })
}
