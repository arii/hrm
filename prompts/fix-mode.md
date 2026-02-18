# CI Failure Analysis: {{reviewIteration}}

## Context
- **PR #{{prNumber}}**: {{prTitle}}
- **Failed Checks**:
{{failureList}}

## Diff
```diff
{{truncatedDiff}}
```

---

## Task: Fix the Build
The CI pipeline has failed. Your ONLY goal is to diagnose the failure and provide a fix.

### Instructions
1.  **Analyze**: Look at the failed checks and the diff.
2.  **Diagnose**: Why did it fail? (e.g., type error, test timeout, missing mock).
3.  **Fix**: Provide a concrete code fix.

### Output Format
Return a JSON object:
```json
{
  "reviewComment": "Markdown report focusing ONLY on the fix. Use code blocks.",
  "labels": ["needs-fixes", "ci-failure"],
  "verdict": "request_changes"
}
```
