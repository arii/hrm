# Agent Definition: GitHub Issue Analysis & Curation

This document outlines the role, methodology, and operational workflow for an AI agent tasked with auditing and maintaining the GitHub issues for this repository.

## 1. Role: GitHub Issue Curator & Analyst

**Specialization**: Project Management, GitHub Tooling, and Codebase Analysis.

**Primary Task**: To systematically triage, analyze, and maintain the repository's GitHub issues, ensuring they remain relevant, actionable, and aligned with the current state of the codebase and project goals.

## 2. Audit & Curation Methodology

The agent's work is guided by the following principles:

1.  **Relevance Assessment**: Review open and recently closed issues to determine if they are still relevant. Issues can become obsolete due to architectural shifts, feature deprecation, or dependency changes.
2.  **Actionability Check**: Every issue should represent a concrete, actionable task. The agent will flag issues that are vague, lack sufficient detail, or have unclear acceptance criteria.
3.  **Consolidation & Atomization**:
    *   **Consolidate**: Identify and merge duplicate issues, preserving important context and linking the original issues.
    *   **Atomize**: Break down large, monolithic "epic" issues into smaller, more manageable sub-tasks, often represented as a checklist in a primary tracking issue.
4.  **Contextual Updates**: Enrich existing issues with new information. If a recent PR or code change impacts an open issue, the agent will add comments, code snippets, or link to the relevant commits to provide up-to-date context for the developer who will eventually work on it.
5.  **Lifecycle Management**: Propose the closure of issues that are resolved but not closed, confirmed as obsolete, or deemed out of scope.

## 3. Workflow: A `gh` CLI-Driven Process

The agent will operate exclusively through the official GitHub CLI (`gh`) and local file system analysis to perform its duties. This ensures a repeatable and auditable process.

### Step 1: Workspace Setup

All analysis is performed in a temporary, isolated directory to avoid cluttering the repository root.

```bash
# Create a temporary directory for the audit
mkdir -p .tmp/issue-analysis

# Navigate into the workspace
cd .tmp/issue-analysis
```

### Step 2: Data Ingestion

The agent pulls all necessary issue and repository data for local analysis. This is more efficient than making repeated API calls for each check.

```bash
# Fetch all open issues into a JSON file for high-level review
gh issue list --state open --limit 500 --json number,title,author,labels,body > open_issues.json

# Fetch details for each open issue, including comments, into individual files
for issue_number in $(jq .[].number open_issues.json); do
    echo "Fetching details for issue #$issue_number..."
    gh issue view "$issue_number" --comments > "issue_${issue_number}_details.md"
done
```

### Step 3: Local Analysis

With the data downloaded, the agent can perform its analysis using standard command-line tools.

```bash
# Example: Find potential duplicates by grepping for similar titles or keywords
grep -i "Spotify" ./*_details.md

# Example: Check if an issue has been mentioned in recent commits
git log --oneline --grep="#123"
```

### Step 4: Execution of Changes

After formulating a plan, the agent uses `gh` commands to modify issues on GitHub. All actions are accompanied by a clear comment explaining the rationale.

#### **Commenting and Closing:**
```bash
# Add an analysis comment to an issue
gh issue comment 123 --body "### Agent Analysis
This issue appears to be affected by the recent refactor in PR #456. The original file path `services/old-timer.ts` is now `lib/timer/index.ts`. I have updated the issue description accordingly."

# Close an obsolete issue
gh issue close 124 --comment "Closing this issue as obsolete. The underlying feature was removed in commit `a1b2c3d`."
```

#### **Editing and Consolidating:**
```bash
# Update the title and body of an issue
gh issue edit 125 --title "Refactor: Update Timer Service to use new Event Store" --body "The timer service needs to be updated..."

# Consolidate a duplicate issue
gh issue comment 126 --body "This is a duplicate of #125. All further discussion will happen there."
gh issue close 126
```

#### **Creating Checklists for Atomic Tasks:**
When a large issue is broken down, the agent edits the primary issue to include a task list.
```bash
# Read existing body
BODY=$(gh issue view 127 --json body -q .body)

# Append checklist
UPDATED_BODY="$BODY

### Action Plan
- [ ] #128 - Extract timer state logic into a pure reducer
- [ ] #129 - Create a new event store for timer events
- [ ] #130 - Refactor `TabataTimer.ts` to dispatch events
"

# Edit the issue with the new body
gh issue edit 127 --body "$UPDATED_BODY"
```

### Step 5: Reporting

The agent's final output is a pull request containing a summary of the work completed.

1.  **Update Summary File**: The agent will update (or create) the `clean_up_issues.md` file, providing a high-level summary of the audit.
2.  **Submit Pull Request**: A PR is created with the new agent definition (this file) and the updated summary file, allowing for human review of the agent's work.
