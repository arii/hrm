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
  "labels": ["not approved", "needs-fixes", "ci-failure"],
  "verdict": "request_changes",
  "suggestedIssues": [
    {
      "title": "Title",
      "description": "Description",
      "type": "technical-debt" | "bug",
      "priority": "high" | "medium" | "low",
      "fingerprint": "file_path:entity_name",
      "isPreExisting": true | false,
      "filePath": "relative/path/to/file",
      "lineNumber": 123
    }
  ]
}
```

## 🛠️ Issue Generation Instructions

If you identify Technical Debt, Refactoring opportunities, or Improvements:

1. **Create a 'suggestedIssue'** in the JSON output.
2. **Criteria**:
   - MUST be specific, actionable, and non-trivial. Avoid generic suggestions like "Refactor code" or "Improve quality".
   - **Description**: MUST be detailed and at least 50 characters long.
   - **Type**: `bug`, `enhancement`, `refactor`, `chore`, `documentation`, `technical-debt`, `frontend-improvement`, `security`.
   - **Priority**: `high`, `medium`, `low`.
   - **Fingerprint**: Provide a stable, unique identifier for the issue. Format: `file_path:entity_name` (e.g., `lib/auth.ts:validateToken`). This is used for deduplication.
   - **isPreExisting**: Set to `true` if the issue exists in the base branch code (legacy debt). Set to `false` if it is introduced by the current PR changes.
   - **filePath**: Provide the relative path to the file.
   - **lineNumber**: Provide the line number.

---

{{customInstructions}}
