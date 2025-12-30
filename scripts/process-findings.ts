// scripts/process-findings.ts
import { readFile } from 'fs/promises'
import { Octokit } from '@octokit/rest'

interface Finding {
  file: string
  line: number
  category: string
  severity: string
  message: string
  suggestion: string
}

interface ReviewArtifact {
  findings: Finding[]
}

interface ReviewResult {
  reviewArtifact: ReviewArtifact
}

async function main() {
  const ghToken = process.env.GITHUB_TOKEN
  const repo = process.env.GH_REPO // e.g., 'arii/hrm'

  if (!ghToken || !repo) {
    console.error(
      'Error: GITHUB_TOKEN and GH_REPO environment variables are required.'
    )
    process.exit(1)
  }

  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    console.error('Error: Invalid GH_REPO format. Expected "owner/repo".')
    process.exit(1)
  }

  const octokit = new Octokit({ auth: ghToken })

  let reviewResult: ReviewResult
  try {
    const content = await readFile('review_result.json', 'utf-8')
    reviewResult = JSON.parse(content)
  } catch (error) {
    console.error('Error reading or parsing review_result.json:', error)
    return // Exit gracefully if the file doesn't exist or is invalid
  }

  const findings = reviewResult.reviewArtifact?.findings || []
  const debtFindings = findings.filter(
    (f) =>
      f.category.toLowerCase() === 'debt' ||
      f.category.toLowerCase() === 'refactor'
  )

  if (debtFindings.length === 0) {
    console.log('No technical debt findings to process.')
    return
  }

  console.log(`Found ${debtFindings.length} technical debt findings to process.`)

  for (const finding of debtFindings) {
    const issueTitle = `Tech Debt: ${finding.message.substring(0, 80)}`
    const issueBody = `
**File**: \`${finding.file}\` (Line: ${finding.line})
**Severity**: ${finding.severity}
**Category**: ${finding.category}

**Description**:
${finding.message}

**Suggestion**:
${finding.suggestion}

*This issue was automatically generated from an AI code review.*
`

    try {
      // Check for existing issues to prevent duplicates
      const q = `is:issue is:open repo:${repo} in:title "${issueTitle}"`
      const { data: existingIssues } = await octokit.search.issuesAndPullRequests(
        { q }
      )

      if (existingIssues.total_count > 0) {
        console.log(
          `An issue with a similar title already exists. Skipping: "${issueTitle}"`
        )
        continue
      }

      // Create the new issue
      await octokit.issues.create({
        owner,
        repo: repoName,
        title: issueTitle,
        body: issueBody,
        labels: ['technical-debt', 'ai-generated'],
      })
      console.log(`Successfully created issue: "${issueTitle}"`)
    } catch (error) {
      console.error(
        `Error creating issue for finding: ${finding.message}`,
        error
      )
    }
  }
}

main()
