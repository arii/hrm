# Manual Trigger and Comment Command Reference

This document provides a comprehensive guide for manually invoking Gemini AI workflows and other automation tasks via GitHub Actions and issue/PR comments.

## Summary Table

| Workflow | Comment Command | Workflow Dispatch Input | CLI Command |
| :--- | :--- | :--- | :--- |
| **PR Review** | `@gemini-bot` | `pr_number` (string) | `gh workflow run reusable-gemini-review.yml -f pr_number=123` |
| **PR Squash** | `@pr-squash` | N/A | N/A |
| **Conflict Resolve** | `@conflict-resolve` | N/A | N/A |

---

## 1. PR Review

Generates an AI-powered code review for a pull request.

### Triggering via Comment
Post a comment on a pull request:
```
@gemini-bot
```

### Triggering via GitHub Actions UI
1. Navigate to **Actions** -> **Reusable Gemini Review**.
2. Click **Run workflow**.
3. Enter the **PR number**.
4. (Optional) Set **Force review** to `true` to bypass throttling.

---

## 2. Cost and Control Guidelines

If automatic workflows are disabled via repository variables (e.g., `GEMINI_ENABLE_TRIAGE=false`), manual triggers **will still work**. This allows the team to save costs on routine events while retaining the ability to use AI for specific, high-value tasks.

To re-enable automatic triggers, set the corresponding repository variable to `true`.
