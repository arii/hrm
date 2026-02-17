# Technical Debt Analysis

## Task
Identify **pre-existing** technical debt revealed by the changes in this PR.

## Rules
1.  **Ignore New Issues**: Do not critique the changes in the PR. Focus only on the code that was *already there* but is touched or exposed by this PR.
2.  **Look For**:
    - Deprecated patterns.
    - Architectural violations.
    - Spaghetti code.
    - Lack of type safety (e.g., `any`).

## Output Format
Return a JSON object:
```json
{
  "issues": [
    {
      "title": "Short Title",
      "description": "Explanation of the debt and potential fix.",
      "fingerprint": "Unique ID (e.g. filename:function_name)"
    }
  ]
}
```

## Diff
```diff
{{diff}}
```
