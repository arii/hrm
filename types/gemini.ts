// types/gemini.ts

export interface ReleaseNoteResult {
  version: string
  markdown: string
  categories: {
    features: string[]
    fixes: string[]
    chores: string[]
  }
}

export interface GithubPullRequest {
  number: number
  title: string
  user: {
    login: string
  }
  merged_at: string | null
  body: string | null
  head: {
    ref: string
  }
  created_at: string
  draft: boolean
  html_url: string
  state: 'open' | 'closed' | 'merged'
  mergeable: boolean | null
}
