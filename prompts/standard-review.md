# PR Review Task

## Review Iteration: {{reviewIteration}}

You are an AI code reviewer. Your task is to provide a constructive and thorough review of the following pull request.

### PR Metadata
- **PR #{{prNumber}}**: {{prTitle}}
- **Author**: @{{prAuthor}}
- **Branch**: `{{prBranchName}}`
- **Labels**: {{prLabels}}
- **Linked Issue**: #{{issueNumber}} - {{issueTitle}}
- **Previous Reviews**: {{reviewCount}} ({{resolvedCount}} resolved, {{changesRequested}} changes requested)
- **Review Depth**: {{reviewDepth}}

### PR Statistics
- **Files Changed**: {{filesChanged}}
- **Total Lines of Code**: {{totalLoc}}
- **Changed Areas**: {{changedAreas}}

### Task Description from Linked Issue
{{linkedIssueBody}}

### Commit Messages
```
{{commitMessages}}
```

{{testCoverageAlert}}

### Previous Review Comments
{{previousReviews}}

### Context Files
{{contextContent}}

### Diff to Review
```diff
{{truncatedDiff}}
```

### Your Task
1.  **Analyze the changes**: Review the diff carefully.
2.  **Identify Issues**: Look for bugs, performance issues, security vulnerabilities, and deviations from best practices.
3.  **Provide Feedback**: Write a clear and concise review comment.
4.  **Suggest Labels**: Suggest appropriate labels (e.g., 'bug', 'enhancement', 'needs-tests').
5.  **Provide a Verdict**: State whether you 'approve', 'request_changes', or just 'comment'.

**Output your response in JSON format matching the following schema:**
```json
{
  "reviewComment": "string",
  "labels": ["string"],
  "verdict": "string"
}
```
