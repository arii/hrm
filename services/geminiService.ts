import { GoogleGenAI, Type } from '@google/genai'
import {
  GithubIssue,
  GithubPullRequest,
  ProposedIssue,
  PrActionRecommendation,
  LinkSuggestion,
  CleanupAnalysisResult,
  RedundancyAnalysisResult,
  TriageAnalysisResult,
  BranchCleanupResult,
  JulesSession,
  JulesAgentAction,
  EnrichedPullRequest,
  ReleaseNoteResult,
} from '../types/gemini'

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY // Ensure GEMINI_API_KEY is configured for server-side use
  if (!apiKey) {
    throw new Error('Gemini API Key is missing')
  }
  return new GoogleGenAI({ apiKey })
}

// --- NEW: Generate Structured Release Notes ---
export const generateReleaseNotes = async (
  mergedPrs: GithubPullRequest[],
  version: string
): Promise<ReleaseNoteResult> => {
  if (!mergedPrs || mergedPrs.length === 0) {
    return {
      version,
      markdown: 'No merged PRs to report.',
      categories: { features: [], fixes: [], chores: [] },
    }
  }
  const client = getClient()

  const prSummaries = mergedPrs.map((p) => ({
    number: p.number,
    title: p.title,
    author: p.user.login,
    merged_at: p.merged_at,
    body: p.body ? p.body.substring(0, 200) : '',
  }))

  const prompt = `
    You are a Release Manager.
    I have a list of merged Pull Requests.

    Goal: Generate professional Release Notes for version ${version}.

    1. Categorize each PR into 'Features', 'Bug Fixes', or 'Maintenance/Chores'.
    2. Write a user-friendly summary for each entry.
    3. Output a structured JSON containing the raw markdown report and the categorized lists.

    Merged PRs:
    ${JSON.stringify(prSummaries)}
  `

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          version: { type: Type.STRING },
          markdown: { type: Type.STRING },
          categories: {
            type: Type.OBJECT,
            properties: {
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              fixes: { type: Type.ARRAY, items: { type: Type.STRING } },
              chores: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
        required: ['version', 'markdown', 'categories'],
      },
    },
  })

  const text = response.text || '{}'
  return JSON.parse(text) as ReleaseNoteResult
}

// --- NEW: Intelligent PR Enrichment (The "Polisher") ---
export const enrichPrDescription = async (
  pr: GithubPullRequest
): Promise<{ title: string; body: string; analysis: string }> => {
  const client = getClient()

  const prompt = `
    You are a Technical Editor.
    Refine the following Pull Request title and description to meet high engineering standards.

    Standards:
    - Title: Imperative mood (e.g., "Add user auth" not "Added user auth").
    - Body: clearly state "Why", "What", and "How". Include a "Testing" section.

    Current Title: ${pr.title}
    Current Body: ${pr.body}

    Output JSON with improved 'title', 'body', and a brief 'analysis' of what was fixed.
  `

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          body: { type: Type.STRING },
          analysis: { type: Type.STRING },
        },
        required: ['title', 'body', 'analysis'],
      },
    },
  })

  return JSON.parse(response.text || '{}')
}

// --- UPDATED: Suggest New Strategic Issues (Context Aware) ---
export const suggestStrategicIssues = async (
  issues: GithubIssue[],
  prs: GithubPullRequest[],
  mode: string,
  userGuidance?: string,
  projectContext?: string
): Promise<ProposedIssue[]> => {
  const client = getClient()
  const context = {
    issues: issues.slice(0, 30).map((i) => i.title),
    prs: prs.slice(0, 20).map((p) => p.title),
  }

  let contextBlock = ''
  if (projectContext) {
    if (projectContext.length > 10000) {
      console.warn(
        'Warning: projectContext was truncated to 10000 characters.'
      )
      contextBlock = `
\nProject Context / Guidelines:\n${projectContext.substring(0, 10000)}`
    } else {
      contextBlock = `
\nProject Context / Guidelines:\n${projectContext}`
    }
  }

  let specificPrompt = ''
  switch (mode) {
    case 'strategic':
      specificPrompt =
        'Identify high-level gaps in features, documentation, or major testing coverage. Suggest 3 high-value strategic issues that advance the project significantly.'
      break
    case 'tech_debt':
      specificPrompt =
        'Focus on general code quality, maintainability, and reliability.'
      break
    case 'quick_win':
      specificPrompt =
        "Focus on 'Quick Wins' or 'Good First Issues'. Suggest very small, actionable, low-effort tasks like UI polish, typo fixes, README updates, or simple configuration tweaks."
      break
    case 'code_reuse':
      specificPrompt =
        'Identify opportunities for code reuse. Look for likely duplicated logic inferred from feature sets and suggest creating shared utilities or components.'
      break
    case 'dead_code':
      specificPrompt =
        'Identify potential dead code or deprecated features that should be removed to improve maintainability.'
      break
    case 'readability':
      specificPrompt =
        'Focus on function/file naming and readability. Suggest renaming or restructuring for better clarity and developer experience.'
      break
    case 'maintainability':
      specificPrompt =
        'Focus on updating dependencies, replacing unsupported packages with modern tools, or improving CI/CD pipelines.'
      break
    default:
      specificPrompt = 'Suggest improvements based on best practices.'
  }

  if (userGuidance) {
    specificPrompt += `\n\nUSER GUIDANCE (Prioritize this): "${userGuidance}"`
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `
      Based on the current list of issues and pull requests, suggest new issues to create.

      ${contextBlock}

      CRITICAL: Do NOT suggest issues that are duplicates of the existing "Issues" list provided in the context.

      FOCUS: ${specificPrompt}

      Context: ${JSON.stringify(context)}
    `,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            reason: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            effort: {
              type: Type.STRING,
              enum: ['Small', 'Medium', 'Large'],
              description: 'Estimated effort to complete the task',
            },
            labels: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'body', 'reason', 'priority', 'effort', 'labels'],
        },
      },
    },
  })

  const text = response.text || '[]'
  return JSON.parse(text) as ProposedIssue[]
}

// Analyze Issues for Redundancies (Structured)
export const analyzeIssueRedundancy = async (
  issues: GithubIssue[]
): Promise<RedundancyAnalysisResult> => {
  if (!issues || issues.length === 0) {
    return {
      summary: 'No issues to analyze.',
      redundantIssues: [],
      consolidatedIssues: [],
    }
  }
  const client = getClient()
  const issueSummary = issues.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ? i.body.substring(0, 300) : 'No description',
    labels: i.labels.map((l) => l.name).join(', '),
  }))
  const prompt = `You are a senior project manager analyzing a GitHub repository. I have a list of open issues. Your goal is to identify: 1. Duplicate issues that can be closed. 2. Groups of related issues. Output a structured JSON response. Issues Data: ${JSON.stringify(issueSummary)}`
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          redundantIssues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issueNumber: { type: Type.INTEGER },
                reason: { type: Type.STRING },
              },
              required: ['issueNumber', 'reason'],
            },
          },
          consolidatedIssues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                body: { type: Type.STRING },
                labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                reason: { type: Type.STRING },
                replacesIssueNumbers: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
              },
              required: [
                'title',
                'body',
                'labels',
                'reason',
                'replacesIssueNumbers',
              ],
            },
          },
        },
        required: ['summary', 'redundantIssues', 'consolidatedIssues'],
      },
    },
  })
  return JSON.parse(response.text || '{}') as RedundancyAnalysisResult
}

export const identifyRedundantCandidates = async (
  issues: GithubIssue[]
): Promise<number[]> => {
  if (!issues || issues.length === 0) return []
  const client = getClient()
  const issueSummary = issues.map((i) => ({
    id: i.number,
    title: i.title,
    body: i.body ? i.body.substring(0, 100) : '',
  }))
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Analyze these issues and identify ones that are likely duplicates. Return ONLY a JSON array of issue numbers to CLOSE. Issues: ${JSON.stringify(issueSummary)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    },
  })
  return JSON.parse(response.text || '[]') as number[]
}

export const analyzePullRequests = async (
  prs: GithubPullRequest[]
): Promise<string> => {
  if (!prs || prs.length === 0) return 'No Pull Requests to analyze.'
  const client = getClient()
  const prSummary = prs.map((p) => ({
    number: p.number,
    title: p.title,
    author: p.user.login,
    branch: p.head.ref,
    created: p.created_at,
    draft: p.draft,
    body: p.body ? p.body.substring(0, 200) : 'No description',
  }))
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `You are a Lead DevOps Engineer. Analyze these Pull Requests. Provide a concise Markdown executive summary. PR Data: ${JSON.stringify(prSummary)}`,
  })
  return response.text || 'No analysis generated.'
}

export const generateCleanupReport = async (
  openIssues: GithubIssue[],
  closedPrs: GithubPullRequest[]
): Promise<CleanupAnalysisResult> => {
  if (
    !openIssues ||
    openIssues.length === 0 ||
    !closedPrs ||
    closedPrs.length === 0
  )
    return { report: 'Insufficient data.', actions: [] }
  const client = getClient()
  const recentClosedPrs = closedPrs.slice(0, 30).map((p) => ({
    number: p.number,
    title: p.title,
    merged_at: p.merged_at,
    body: p.body ? p.body.substring(0, 300) : '',
  }))
  const currentOpenIssues = openIssues.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ? i.body.substring(0, 100) : '',
  }))
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Determine if any OPEN issues should be closed by CLOSED Pull Requests. Open Issues: ${JSON.stringify(currentOpenIssues)} Recently Closed PRs: ${JSON.stringify(recentClosedPrs)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report: { type: Type.STRING },
          actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issueNumber: { type: Type.INTEGER },
                action: { type: Type.STRING, enum: ['close', 'comment'] },
                reason: { type: Type.STRING },
                prReference: { type: Type.INTEGER, nullable: true },
                commentBody: { type: Type.STRING },
                confidence: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
              },
              required: ['issueNumber', 'action', 'reason', 'confidence'],
            },
          },
        },
        required: ['report', 'actions'],
      },
    },
  })
  return JSON.parse(response.text || '{}') as CleanupAnalysisResult
}

export const analyzeBranchCleanup = async (
  branches: string[],
  mergedPrs: { ref: string; number: number }[]
): Promise<BranchCleanupResult> => {
  if (!branches || branches.length === 0)
    return { report: 'No branches.', candidates: [] }
  const client = getClient()
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Identify Zombie and Stale branches. Data: ${JSON.stringify({ branches, mergedPrs })}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report: { type: Type.STRING },
          candidates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                branchName: { type: Type.STRING },
                reason: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ['merged', 'stale', 'abandoned'],
                },
                confidence: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
              },
              required: ['branchName', 'reason', 'type', 'confidence'],
            },
          },
        },
        required: ['report', 'candidates'],
      },
    },
  })
  return JSON.parse(response.text || '{}') as BranchCleanupResult
}

export const generateTriageReport = async (
  issues: GithubIssue[]
): Promise<TriageAnalysisResult> => {
  if (!issues || issues.length === 0)
    return { report: 'No issues.', actions: [] }
  const client = getClient()
  const issueData = issues.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ? i.body.substring(0, 150) : '',
    labels: i.labels.map((l) => l.name),
    created_at: i.created_at,
  }))
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Create a prioritized Triage Report. Issues: ${JSON.stringify(issueData)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report: { type: Type.STRING },
          actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issueNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                suggestedLabels: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                reason: { type: Type.STRING },
                priority: {
                  type: Type.STRING,
                  enum: ['High', 'Medium', 'Low'],
                },
                effort: {
                  type: Type.STRING,
                  enum: ['Small', 'Medium', 'Large'],
                },
                category: { type: Type.STRING },
              },
              required: [
                'issueNumber',
                'title',
                'suggestedLabels',
                'reason',
                'priority',
                'effort',
                'category',
              ],
            },
          },
        },
        required: ['report', 'actions'],
      },
    },
  })
  return JSON.parse(response.text || '{}') as TriageAnalysisResult
}

export const auditPullRequests = async (
  prs: GithubPullRequest[]
): Promise<PrActionRecommendation[]> => {
  if (!prs || prs.length === 0) return []
  const client = getClient()
  const prData = prs.map((p) => ({
    number: p.number,
    title: p.title,
    created: p.created_at,
    draft: p.draft,
    user: p.user.login,
  }))
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Review these open PRs. PRs: ${JSON.stringify(prData)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            prNumber: { type: Type.INTEGER },
            action: {
              type: Type.STRING,
              enum: ['close', 'prioritize', 'comment'],
            },
            reason: { type: Type.STRING },
            suggestedComment: { type: Type.STRING },
          },
          required: ['prNumber', 'action', 'reason'],
        },
      },
    },
  })
  return JSON.parse(response.text || '[]') as PrActionRecommendation[]
}

export const findIssuePrLinks = async (
  issues: GithubIssue[],
  prs: GithubPullRequest[]
): Promise<LinkSuggestion[]> => {
  if (!issues || issues.length === 0 || !prs || prs.length === 0) return []
  const client = getClient()
  const issueData = issues.map((i) => ({ id: i.number, title: i.title }))
  const prData = prs.map((p) => ({ id: p.number, title: p.title }))
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Match PRs to Issues. Issues: ${JSON.stringify(issueData)} PRs: ${JSON.stringify(prData)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            prNumber: { type: Type.INTEGER },
            issueNumber: { type: Type.INTEGER },
            confidence: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['prNumber', 'issueNumber', 'confidence', 'reason'],
        },
      },
    },
  })
  return JSON.parse(response.text || '[]') as LinkSuggestion[]
}

export const analyzeJulesSessions = async (
  sessions: JulesSession[],
  prs: EnrichedPullRequest[]
): Promise<JulesAgentAction[]> => {
  if (!sessions || sessions.length === 0) return []
  const client = getClient()
  const prMap = new Map(prs.map((p) => [p.html_url, p]))
  const sessionData = sessions.map((s) => {
    const prUrl = s.outputs?.find((o) => o.pullRequest)?.pullRequest?.url
    let prContext = 'No PR linked'
    let hasConflicts = false
    if (prUrl) {
      const pr = prMap.get(prUrl)
      if (pr) {
        prContext = `Linked PR #${pr.number} is ${pr.state.toUpperCase()}.`
        if (pr.mergeable === false) {
          hasConflicts = true
          prContext += ' HAS MERGE CONFLICTS.'
        } else if (pr.merged_at) {
          prContext += ' MERGED.'
        }
      } else {
        prContext = 'PR exists but status unknown.'
      }
    }
    return {
      name: s.name,
      title: s.title,
      state: s.state,
      createTime: s.createTime,
      prContext: prContext,
      hasConflicts: hasConflicts,
      lastStatus: s.state,
    }
  })
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `Analyze sessions. Sessions: ${JSON.stringify(sessionData)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sessionName: { type: Type.STRING },
            action: {
              type: Type.STRING,
              enum: ['delete', 'recover', 'publish', 'message'],
            },
            reason: { type: Type.STRING },
            suggestedCommand: { type: Type.STRING },
          },
          required: ['sessionName', 'action', 'reason'],
        },
      },
    },
  })
  return JSON.parse(response.text || '[]') as JulesAgentAction[]
}

interface RepoStats {
  openIssuesCount: number
  openPRsCount: number
}

export const generateRepoBriefing = async (
  stats: RepoStats,
  velocity: { opened: number; closed: number },
  recentActivity: GithubIssue[],
  stalePrs: GithubPullRequest[]
): Promise<string> => {
  const client = getClient()
  const activitySummary = recentActivity
    .slice(0, 10)
    .map((i) => `[${i.state}] ${i.title}`)
  const context = {
    totalOpenIssues: stats.openIssuesCount,
    totalOpenPRs: stats.openPRsCount,
    velocity: velocity,
    stalePRCount: stalePrs.length,
    recentActivity: activitySummary,
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: `You are a CTO. Write a 3-sentence summary. Stats: ${JSON.stringify(context)}`,
  })
  return response.text || 'Repo is stable.'
}
