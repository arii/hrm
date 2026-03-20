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

### VRT Failure Guardrails (Apply when failure is visual regression related)

1. Do not raise `maxDiffPixelRatio` as the first fix.
2. Keep baseline `maxDiffPixelRatio: 0.1`; allow up to `0.15` only with explicit dynamic-capture justification.
3. Treat `maxDiffPixelRatio > 0.15` as a policy violation unless exceptional rationale is provided.
4. Keep screenshot defaults aligned with `threshold: 0.2` and `scale: 'css'`.
5. Reject sleep-based stabilization (`waitForTimeout(...)`); prefer deterministic readiness checks:

- `await page.evaluateHandle(() => document.fonts.ready)`
- `await page.waitForLoadState('networkidle')`
- explicit UI assertions (`toBeVisible`, `toHaveCSS`, `toHaveText`)
- layout read (`await page.evaluate(() => document.body.offsetHeight)`)

6. For responsive captures, require explicit viewport lock and width convergence checks.
7. Prefer dynamic masking (`getDynamicContentMasks`, `getHrMasks`) over tolerance inflation.
8. For portal-based locator captures, avoid full-page scroll side effects and use `skipA11y: true` only with rationale.
9. Ensure deterministic lifecycle handling in stateful suites (`resetServerState(request)` and teardown hooks such as `stopTimer(...)`).

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
