export interface ReleaseNoteResult {
  version: string;
  markdown: string;
  categories: {
    features: string[];
    fixes: string[];
    chores: string[];
  };
}

export interface GithubIssue {
  [key: string]: any;
}

export interface GithubPullRequest {
  [key: string]: any;
}

export interface ProposedIssue {
  [key: string]: any;
}

export interface PrActionRecommendation {
  [key: string]: any;
}

export interface LinkSuggestion {
  [key: string]: any;
}

export interface CleanupAnalysisResult {
  [key: string]: any;
}

export interface RedundancyAnalysisResult {
  [key: string]: any;
}

export interface TriageAnalysisResult {
  [key: string]: any;
}

export interface BranchCleanupResult {
  [key: string]: any;
}

export interface JulesSession {
  [key: string]: any;
}

export interface JulesAgentAction {
  [key: string]: any;
}

export interface EnrichedPullRequest {
  [key: string]: any;
}
