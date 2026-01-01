import { execSync } from 'child_process'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { generateContentWithFallback, cleanJsonOutput } from './gemini-client'

interface Issue {
  number: number
  title: string
}

const DuplicateSchema = z.object({
  duplicates: z.array(z.array(z.number())),
})

export async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.')
    process.exit(1)
  }

  const ghToken = process.env.GH_TOKEN
  if (!ghToken) {
    console.error('Error: GH_TOKEN environment variable is not set.')
    process.exit(1)
  }

  console.log('Fetching open issues...')
  const issuesOutput = execSync(
    'gh issue list --state open --json number,title --limit 100'
  ).toString()
  const issues: Issue[] = JSON.parse(issuesOutput)

  if (issues.length < 2) {
    console.log('Not enough issues to compare for duplicates. Exiting.')
    return
  }

  const issueList = issues
    .map((issue) => `  - #${issue.number}: ${issue.title}`)
    .join('\n')
  const issueNumberSet = new Set(issues.map((issue) => issue.number))

  const prompt = `
You are an expert at identifying duplicate GitHub issues.
Analyze the following list of issues and identify any that are duplicates of each other based on their titles.
Return a JSON object with a key "duplicates" which is an array of arrays, where each inner array is a cluster of duplicate issue numbers.
Do not include issues that are not duplicates.

Example Response:
{
  "duplicates": [
    [101, 105],
    [123, 124, 129]
  ]
}

Here is the list of issues:
${issueList}
`

  const genAI = new GoogleGenerativeAI(apiKey)
  console.log('Querying the AI for duplicate issues...')
  const resultText = await generateContentWithFallback({
    genAI,
    prompt,
    config: {
      generationConfig: {
        responseMimeType: 'application/json',
      },
    },
  })

  if (!resultText) {
    console.log('AI returned no response. Exiting.')
    return
  }

  try {
    const cleanedJson = cleanJsonOutput(resultText)
    const parsed = JSON.parse(cleanedJson)
    const validationResult = DuplicateSchema.safeParse(parsed)

    if (!validationResult.success) {
      console.error('AI response failed validation:', validationResult.error)
      console.error('Raw AI response:', resultText)
      process.exit(1)
    }

    const result = validationResult.data

    if (result.duplicates && result.duplicates.length > 0) {
      console.log(
        `Found ${result.duplicates.length} potential sets of duplicate issues.`
      )
      for (const cluster of result.duplicates) {
        if (cluster.length > 1) {
          const validCluster = cluster.filter((num) => issueNumberSet.has(num))

          if (validCluster.length > 1) {
            const sortedCluster = validCluster.sort((a, b) => a - b)
            const primaryIssue = sortedCluster[0]
            const duplicateIssues = sortedCluster.slice(1)
            const commentBody = `Possible duplicates found by AI: ${duplicateIssues
              .map((n) => `#${n}`)
              .join(', ')}`

            try {
              console.log(
                `Commenting on issue #${primaryIssue}: "${commentBody}"`
              )
              execSync(
                `gh issue comment ${primaryIssue} --body "${commentBody}"`,
                {
                  env: { ...process.env, GH_TOKEN: ghToken },
                }
              )
              console.log(`  ✅ Posted duplicate notice on #${primaryIssue}`)
            } catch (commentError) {
              console.error(
                `  ❌ Failed to post comment on #${primaryIssue}:`,
                (commentError as Error).message
              )
            }
          } else {
            console.log(
              'Skipping cluster with less than two valid, existing issue numbers:',
              cluster
            )
          }
        }
      }
    } else {
      console.log('No duplicate issues found in AI response.')
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    console.error('Raw AI response:', resultText)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(console.error)
}
