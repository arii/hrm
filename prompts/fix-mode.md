# PR Fix Review Task

## Review Iteration: {{reviewIteration}}

You are an AI code reviewer. This PR has failed checks. Your primary task is to analyze the failures and the provided code changes to determine if the fix is correct and complete.

### Failed Checks
{{failureList}}

### PR Metadata
- **PR #{{prNumber}}**: {{prTitle}}
- **Author**: @{{prAuthor}}
- **Branch**: `{{prBranchName}}`

### Diff to Review
```diff
{{truncatedDiff}}
```

### Context Files
{{contextContent}}

### Your Task
1.  **Analyze the failed checks**: Understand the root cause of the errors from the logs.
2.  **Evaluate the proposed fix**: Review the diff to see if it correctly addresses the failures.
3.  **Provide Feedback**: Write a clear review comment explaining if the fix is correct or if it needs more work.
4.  **Suggest Labels**: Suggest labels like 'fix', 'bug', 'review-failed'.
5.  **Provide a Verdict**: State 'approve' if the fix is correct, otherwise 'request_changes'.

**Output your response in JSON format matching the following schema:**
```json
{
  "reviewComment": "string",
  "labels": ["string"],
  "verdict": "string"
}
```
