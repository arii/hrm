import * as GoogleAI from "@google/generative-ai";
import { GithubIssue, GithubPullRequest, ProposedIssue, PrActionRecommendation, LinkSuggestion, CleanupAnalysisResult, RedundancyAnalysisResult, TriageAnalysisResult, BranchCleanupResult, JulesSession, JulesAgentAction, EnrichedPullRequest, ReleaseNoteResult } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY; // Ensure VITE_API_KEY or similar is configured in your build
  if (!apiKey) {
    throw new Error("Gemini API Key is missing");
  }
  return new GoogleAI.GoogleGenerativeAI(apiKey);
};

// --- NEW: Generate Structured Release Notes ---
export const generateReleaseNotes = async (
  mergedPrs: GithubPullRequest[],
  version: string
): Promise<ReleaseNoteResult> => {
  if (!mergedPrs || mergedPrs.length === 0) {
    return { version, markdown: "No merged PRs to report.", categories: { features: [], fixes: [], chores: [] } };
  }
  const genAI = getClient();

  const prSummaries = mergedPrs.map(p => ({
    number: p.number,
    title: p.title,
    author: p.user.login,
    merged_at: p.merged_at,
    body: p.body,
  }));

  const prompt = `
    You are a Release Manager.
    I have a list of merged Pull Requests.

    Goal: Generate professional Release Notes for version ${version}.

    1. Categorize each PR into 'Features', 'Bug Fixes', or 'Maintenance/Chores'.
    2. Write a user-friendly summary for each entry.
    3. Output a structured JSON containing the raw markdown report and the categorized lists.

    Merged PRs:
    ${JSON.stringify(prSummaries)}
  `;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
        type: GoogleAI.Type.OBJECT,
        properties: {
          version: { type: GoogleAI.Type.STRING },
          markdown: { type: GoogleAI.Type.STRING },
          categories: {
            type: GoogleAI.Type.OBJECT,
            properties: {
              features: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.STRING } },
              fixes: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.STRING } },
              chores: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.STRING } }
            }
          }
        },
        required: ['version', 'markdown', 'categories']
      }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "{}";
  return JSON.parse(text) as ReleaseNoteResult;
};

// --- NEW: Intelligent PR Enrichment (The "Polisher") ---
export const enrichPrDescription = async (pr: GithubPullRequest): Promise<{ title: string, body: string, analysis: string }> => {
  const genAI = getClient();

  const prompt = `
    You are a Technical Editor.
    Refine the following Pull Request title and description to meet high engineering standards.

    Standards:
    - Title: Imperative mood (e.g., "Add user auth" not "Added user auth").
    - Body: clearly state "Why", "What", and "How". Include a "Testing" section.

    Current Title: ${pr.title}
    Current Body: ${pr.body}

    Output JSON with improved 'title', 'body', and a brief 'analysis' of what was fixed.
  `;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.OBJECT,
      properties: {
        title: { type: GoogleAI.Type.STRING },
        body: { type: GoogleAI.Type.STRING },
        analysis: { type: GoogleAI.Type.STRING }
      },
      required: ['title', 'body', 'analysis']
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "{}";
  return JSON.parse(text);
};

// --- UPDATED: Suggest New Strategic Issues (Context Aware) ---
export const suggestStrategicIssues = async (
  issues: GithubIssue[],
  prs: GithubPullRequest[],
  mode: string,
  userGuidance?: string,
  projectContext?: string
): Promise<ProposedIssue[]> => {
  const genAI = getClient();
  const context = {
    issues: issues.slice(0, 30).map(i => i.title),
    prs: prs.slice(0, 20).map(p => p.title),
  };

  const contextBlock = projectContext ? `\n\nProject Context / Guidelines:\n${projectContext}` : "";

  let specificPrompt = "";
  switch (mode) {
    case 'strategic':
      specificPrompt = "Identify high-level gaps in features, documentation, or major testing coverage. Suggest 3 high-value strategic issues that advance the project significantly.";
      break;
    case 'tech_debt':
      specificPrompt = "Focus on general code quality, maintainability, and reliability.";
      break;
    case 'quick_win':
      specificPrompt = "Focus on 'Quick Wins' or 'Good First Issues'. Suggest very small, actionable, low-effort tasks like UI polish, typo fixes, README updates, or simple configuration tweaks.";
      break;
    case 'code_reuse':
      specificPrompt = "Identify opportunities for code reuse. Look for likely duplicated logic inferred from feature sets and suggest creating shared utilities or components.";
      break;
    case 'dead_code':
      specificPrompt = "Identify potential dead code or deprecated features that should be removed to improve maintainability.";
      break;
    case 'readability':
      specificPrompt = "Focus on function/file naming and readability. Suggest renaming or restructuring for better clarity and developer experience.";
      break;
    case 'maintainability':
      specificPrompt = "Focus on updating dependencies, replacing unsupported packages with modern tools, or improving CI/CD pipelines.";
      break;
    default:
      specificPrompt = "Suggest improvements based on best practices.";
  }

  if (userGuidance) {
    specificPrompt += `\n\nUSER GUIDANCE (Prioritize this): "${userGuidance}"`;
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.ARRAY,
      items: {
        type: GoogleAI.Type.OBJECT,
        properties: {
          title: { type: GoogleAI.Type.STRING },
          body: { type: GoogleAI.Type.STRING },
          reason: { type: GoogleAI.Type.STRING },
          priority: { type: GoogleAI.Type.STRING, enum: ['High', 'Medium', 'Low'] },
          effort: { type: GoogleAI.Type.STRING, enum: ['Small', 'Medium', 'Large'], description: "Estimated effort to complete the task" },
          labels: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.STRING } },
        },
        required: ['title', 'body', 'reason', 'priority', 'effort', 'labels']
      }
    }
  });

  const prompt = `
    Based on the current list of issues and pull requests, suggest new issues to create.

    ${contextBlock}

    CRITICAL: Do NOT suggest issues that are duplicates of the existing "Issues" list provided in the context.

    FOCUS: ${specificPrompt}

    Context: ${JSON.stringify(context)}
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "[]";
  return JSON.parse(text) as ProposedIssue[];
};

// ... (Rest of existing functions: auditPullRequests, findIssuePrLinks, analyzeJulesSessions, analyzeIssueRedundancy, identifyRedundantCandidates, analyzePullRequests, generateCleanupReport, analyzeBranchCleanup, generateTriageReport, generateRepoBriefing - KEEP THESE AS IS)
// [For brevity, assume the previous functions are retained below]
// Analyze Issues for Redundancies (Structured)
export const analyzeIssueRedundancy = async (issues: GithubIssue[]): Promise<RedundancyAnalysisResult> => {
  if (!issues || issues.length === 0) {
    return { summary: "No issues to analyze.", redundantIssues: [], consolidatedIssues: [] };
  }
  const genAI = getClient();
  const issueSummary = issues.map(i => ({ number: i.number, title: i.title, body: i.body, labels: i.labels.map(l => l.name).join(", ") }));
  const prompt = `You are a senior project manager analyzing a GitHub repository. I have a list of open issues. Your goal is to identify: 1. Duplicate issues that can be closed. 2. Groups of related issues. Output a structured JSON response. Issues Data: ${JSON.stringify(issueSummary)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.OBJECT,
      properties: {
        summary: { type: GoogleAI.Type.STRING },
        redundantIssues: {
          type: GoogleAI.Type.ARRAY,
          items: {
            type: GoogleAI.Type.OBJECT,
            properties: {
              issueNumber: { type: GoogleAI.Type.INTEGER },
              reason: { type: GoogleAI.Type.STRING }
            },
            required: ['issueNumber', 'reason']
          }
        },
        consolidatedIssues: {
          type: GoogleAI.Type.ARRAY,
          items: {
            type: GoogleAI.Type.OBJECT,
            properties: {
              title: { type: GoogleAI.Type.STRING },
              body: { type: GoogleAI.Type.STRING },
              labels: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.STRING } },
              reason: { type: GoogleAI.Type.STRING },
              replacesIssueNumbers: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.INTEGER } }
            },
            required: ['title', 'body', 'labels', 'reason', 'replacesIssueNumbers']
          }
        }
      },
      required: ['summary', 'redundantIssues', 'consolidatedIssues']
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "{}";
  return JSON.parse(text) as RedundancyAnalysisResult;
};

export const identifyRedundantCandidates = async (issues: GithubIssue[]): Promise<number[]> => {
  if (!issues || issues.length === 0) return [];
  const genAI = getClient();
  const issueSummary = issues.map(i => ({ id: i.number, title: i.title, body: i.body }));
  const prompt = `Analyze these issues and identify ones that are likely duplicates. Return ONLY a JSON array of issue numbers to CLOSE. Issues: ${JSON.stringify(issueSummary)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.ARRAY,
      items: { type: GoogleAI.Type.INTEGER }
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "[]";
  return JSON.parse(text) as number[];
};

export const analyzePullRequests = async (prs: GithubPullRequest[]): Promise<string> => {
  if (!prs || prs.length === 0) return "No Pull Requests to analyze.";
  const genAI = getClient();
  const prSummary = prs.map(p => ({ number: p.number, title: p.title, author: p.user.login, branch: p.head.ref, created: p.created_at, draft: p.draft, body: p.body }));
  const prompt = `You are a Lead DevOps Engineer. Analyze these Pull Requests. Provide a concise Markdown executive summary. PR Data: ${JSON.stringify(prSummary)}`;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text() || "No analysis generated.";
};

export const generateCleanupReport = async (openIssues: GithubIssue[], closedPrs: GithubPullRequest[]): Promise<CleanupAnalysisResult> => {
  if (!openIssues || openIssues.length === 0 || !closedPrs || closedPrs.length === 0) return { report: "Insufficient data.", actions: [] };
  const genAI = getClient();
  const recentClosedPrs = closedPrs.slice(0, 30).map(p => ({ number: p.number, title: p.title, merged_at: p.merged_at, body: p.body }));
  const currentOpenIssues = openIssues.map(i => ({ number: i.number, title: i.title, body: i.body }));
  const prompt = `Determine if any OPEN issues should be closed by CLOSED Pull Requests. Open Issues: ${JSON.stringify(currentOpenIssues)} Recently Closed PRs: ${JSON.stringify(recentClosedPrs)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.OBJECT,
      properties: {
        report: { type: GoogleAI.Type.STRING },
        actions: {
          type: GoogleAI.Type.ARRAY,
          items: {
            type: GoogleAI.Type.OBJECT,
            properties: {
              issueNumber: { type: GoogleAI.Type.INTEGER },
              action: { type: GoogleAI.Type.STRING, enum: ['close', 'comment'] },
              reason: { type: GoogleAI.Type.STRING },
              prReference: { type: GoogleAI.Type.INTEGER, nullable: true },
              commentBody: { type: GoogleAI.Type.STRING },
              confidence: { type: GoogleAI.Type.STRING, enum: ['high', 'medium', 'low'] }
            },
            required: ['issueNumber', 'action', 'reason', 'confidence']
          }
        }
      },
      required: ['report', 'actions']
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "{}";
  return JSON.parse(text) as CleanupAnalysisResult;
};

export const analyzeBranchCleanup = async (branches: string[], mergedPrs: { ref: string, number: number }[]): Promise<BranchCleanupResult> => {
  if (!branches || branches.length === 0) return { report: "No branches.", candidates: [] };
  const genAI = getClient();
  const prompt = `Identify Zombie and Stale branches. Data: ${JSON.stringify({ branches, mergedPrs })}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.OBJECT,
      properties: {
        report: { type: GoogleAI.Type.STRING },
        candidates: {
          type: GoogleAI.Type.ARRAY,
          items: {
            type: GoogleAI.Type.OBJECT,
            properties: {
              branchName: { type: GoogleAI.Type.STRING },
              reason: { type: GoogleAI.Type.STRING },
              type: { type: GoogleAI.Type.STRING, enum: ['merged', 'stale', 'abandoned'] },
              confidence: { type: GoogleAI.Type.STRING, enum: ['high', 'medium', 'low'] }
            },
            required: ['branchName', 'reason', 'type', 'confidence']
          }
        }
      },
      required: ['report', 'candidates']
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "{}";
  return JSON.parse(text) as BranchCleanupResult;
};

export const generateTriageReport = async (issues: GithubIssue[]): Promise<TriageAnalysisResult> => {
  if (!issues || issues.length === 0) return { report: "No issues.", actions: [] };
  const genAI = getClient();
  const issueData = issues.map(i => ({ number: i.number, title: i.title, body: i.body, labels: i.labels.map(l => l.name), created_at: i.created_at }));
  const prompt = `Create a prioritized Triage Report. Issues: ${JSON.stringify(issueData)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.OBJECT,
      properties: {
        report: { type: GoogleAI.Type.STRING },
        actions: {
          type: GoogleAI.Type.ARRAY,
          items: {
            type: GoogleAI.Type.OBJECT,
            properties: {
              issueNumber: { type: GoogleAI.Type.INTEGER },
              title: { type: GoogleAI.Type.STRING },
              suggestedLabels: { type: GoogleAI.Type.ARRAY, items: { type: GoogleAI.Type.STRING } },
              reason: { type: GoogleAI.Type.STRING },
              priority: { type: GoogleAI.Type.STRING, enum: ['High', 'Medium', 'Low'] },
              effort: { type: GoogleAI.Type.STRING, enum: ['Small', 'Medium', 'Large'] },
              category: { type: GoogleAI.Type.STRING }
            },
            required: ['issueNumber', 'title', 'suggestedLabels', 'reason', 'priority', 'effort', 'category']
          }
        }
      },
      required: ['report', 'actions']
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "{}";
  return JSON.parse(text) as TriageAnalysisResult;
};

export const auditPullRequests = async (prs: GithubPullRequest[]): Promise<PrActionRecommendation[]> => {
  if (!prs || prs.length === 0) return [];
  const genAI = getClient();
  const prData = prs.map(p => ({ number: p.number, title: p.title, created: p.created_at, draft: p.draft, user: p.user.login }));
  const prompt = `Review these open PRs. PRs: ${JSON.stringify(prData)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.ARRAY,
      items: {
        type: GoogleAI.Type.OBJECT,
        properties: {
          prNumber: { type: GoogleAI.Type.INTEGER },
          action: { type: GoogleAI.Type.STRING, enum: ['close', 'prioritize', 'comment'] },
          reason: { type: GoogleAI.Type.STRING },
          suggestedComment: { type: GoogleAI.Type.STRING }
        },
        required: ['prNumber', 'action', 'reason']
      }
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "[]";
  return JSON.parse(text) as PrActionRecommendation[];
};

export const findIssuePrLinks = async (issues: GithubIssue[], prs: GithubPullRequest[]): Promise<LinkSuggestion[]> => {
  if (!issues || issues.length === 0 || !prs || prs.length === 0) return [];
  const genAI = getClient();
  const issueData = issues.map(i => ({ id: i.number, title: i.title }));
  const prData = prs.map(p => ({ id: p.number, title: p.title }));
  const prompt = `Match PRs to Issues. Issues: ${JSON.stringify(issueData)} PRs: ${JSON.stringify(prData)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.ARRAY,
      items: {
        type: GoogleAI.Type.OBJECT,
        properties: {
          prNumber: { type: GoogleAI.Type.INTEGER },
          issueNumber: { type: GoogleAI.Type.INTEGER },
          confidence: { type: GoogleAI.Type.STRING },
          reason: { type: GoogleAI.Type.STRING }
        },
        required: ['prNumber', 'issueNumber', 'confidence', 'reason']
      }
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "[]";
  return JSON.parse(text) as LinkSuggestion[];
};

export const analyzeJulesSessions = async (sessions: JulesSession[], prs: EnrichedPullRequest[]): Promise<JulesAgentAction[]> => {
  if (!sessions || sessions.length === 0) return [];
  const genAI = getClient();
  const prMap = new Map(prs.map(p => [p.html_url, p]));
  const sessionData = sessions.map(s => { const prUrl = s.outputs?.find(o => o.pullRequest)?.pullRequest?.url; let prContext = "No PR linked"; let hasConflicts = false; if (prUrl) { const pr = prMap.get(prUrl); if (pr) { prContext = `Linked PR #${pr.number} is ${pr.state.toUpperCase()}.`; if (pr.mergeable === false) { hasConflicts = true; prContext += " HAS MERGE CONFLICTS."; } else if (pr.merged_at) { prContext += " MERGED."; } } else { prContext = "PR exists but status unknown."; } } return { name: s.name, title: s.title, state: s.state, createTime: s.createTime, prContext: prContext, hasConflicts: hasConflicts, lastStatus: s.state }; });
  const prompt = `Analyze sessions. Sessions: ${JSON.stringify(sessionData)}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    // The Gemini model understands to return JSON that matches this schema.
    responseSchema: {
      type: GoogleAI.Type.ARRAY,
      items: {
        type: GoogleAI.Type.OBJECT,
        properties: {
          sessionName: { type: GoogleAI.Type.STRING },
          action: { type: GoogleAI.Type.STRING, enum: ['delete', 'recover', 'publish', 'message'] },
          reason: { type: GoogleAI.Type.STRING },
          suggestedCommand: { type: GoogleAI.Type.STRING }
        },
        required: ['sessionName', 'action', 'reason']
      }
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text() || "[]";
  return JSON.parse(text) as JulesAgentAction[];
};

export const generateRepoBriefing = async (stats: any, velocity: { opened: number, closed: number }, recentActivity: GithubIssue[], stalePrs: GithubPullRequest[]): Promise<string> => {
  const genAI = getClient();
  const activitySummary = recentActivity.slice(0, 10).map(i => `[${i.state}] ${i.title}`);
  const context = { totalOpenIssues: stats.openIssuesCount, totalOpenPRs: stats.openPRsCount, velocity: velocity, stalePRCount: stalePrs.length, recentActivity: activitySummary };
  const prompt = `You are a CTO. Write a 3-sentence summary. Stats: ${JSON.stringify(context)}`;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text() || "Repo is stable.";
};
