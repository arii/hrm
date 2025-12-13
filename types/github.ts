export interface ReleaseNoteResult {
  version: string
  markdown: string
  categories: {
    features: string[]
    fixes: string[]
    chores: string[]
  }
}

/**
 * A slimmed-down version of the GithubPullRequest type, containing only the
 * information necessary for the release notes generation script.
 */
export interface ReleaseNotePullRequestSummary {
  number: number
  title: string
  user: {
    login: string
  }
  merged_at: string | null
  body: string | null
}

export interface GithubIssue {
  number: number
  title: string
  body: string | null
  labels: { name: string }[]
  state: 'open' | 'closed'
  created_at: string
}

export interface GithubUser {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
}
export interface GithubPullRequest {
  number: number
  title: string
  user: GithubUser
  merged_at?: string | null
  body?: string | null
  state?: 'open' | 'closed'
  html_url?: string
  head: { ref: string }
  created_at: string
  draft: boolean
}

export interface ProposedIssue {
  title: string
  body: string
  reason: string
  priority: 'High' | 'Medium' | 'Low'
  effort: 'Small' | 'Medium' | 'Large'
  labels: string[]
}

export interface PrActionRecommendation {
  prNumber: number
  action: 'close' | 'prioritize' | 'comment'
  reason: string
  suggestedComment?: string
}

export interface LinkSuggestion {
  prNumber: number
  issueNumber: number
  confidence: string
  reason: string
}

export interface CleanupAnalysisResult {
  report: string
  actions: {
    issueNumber: number
    action: 'close' | 'comment'
    reason: string
    prReference?: number
    commentBody?: string
    confidence: 'high' | 'medium' | 'low'
  }[]
}

export interface RedundancyAnalysisResult {
  summary: string
  redundantIssues: {
    issueNumber: number
    reason: string
  }[]
  consolidatedIssues: {
    title: string
    body: string
    labels: string[]
    reason: string
    replacesIssueNumbers: number[]
  }[]
}

export interface TriageAnalysisResult {
  report: string
  actions: {
    issueNumber: number
    title: string
    suggestedLabels: string[]
    reason: string
    priority: 'High' | 'Medium' | 'Low'
    effort: 'Small' | 'Medium' | 'Large'
    category: string
  }[]
}

export interface BranchCleanupResult {
  report: string
  candidates: {
    branchName: string
    reason: string
    type: 'merged' | 'stale' | 'abandoned'
    confidence: 'high' | 'medium' | 'low'
  }[]
}

export interface JulesSession {
  name: string
  title: string
  state: string
  createTime: string
  outputs?: {
    pullRequest?: {
      url: string
    }
  }[]
}

export interface JulesAgentAction {
  sessionName: string
  action: 'delete' | 'recover' | 'publish' | 'message'
  reason: string
  suggestedCommand?: string
}

export interface EnrichedPullRequest {
  html_url: string
  number: number
  state: 'open' | 'closed'
  merged_at: string | null
  mergeable: boolean | null
}
