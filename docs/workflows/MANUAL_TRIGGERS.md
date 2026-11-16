# Manual Trigger and Comment Command Reference

This document provides a comprehensive guide for manually invoking Gemini AI workflows and other automation tasks via GitHub Actions and issue/PR comments.

## Summary Table

| Workflow          | Comment Command         | Workflow Dispatch Input                 | CLI Command                                                                        |
| :---------------- | :---------------------- | :-------------------------------------- | :--------------------------------------------------------------------------------- |
| **PR Review**     | `@gemini-bot`           | `pr_number` (string)                    | `gh workflow run reusable-gemini-review.yml -f pr_number=123`                      |
| **PR Enrichment** | `@gemini-enrich`        | `pr_number` (string)                    | `gh workflow run pr-enrichment.yml -f pr_number=123`                               |
| **Issue Triage**  | `@gemini-triage`        | `issue_number` (number)                 | `gh workflow run gemini-triage.yml -f issue_number=456`                            |
| **Create Issues** | `@create-review-issues` | `pr_number` (string), `run_id` (string) | `gh workflow run reusable-create-review-issues.yml -f pr_number=123 -f run_id=...` |

---

## 1. Issue Triage

Automated triage analyzes new issues, applies labels, assesses priority, and suggests improved titles/descriptions.

### Triggering via Comment

Post a comment on any issue:

```
@gemini-triage
```

### Triggering via GitHub Actions UI

1. Navigate to **Actions** -> **Gemini Smart Triage**.
2. Click **Run workflow**.
3. Enter the **Issue number** to triage.

---

## 2. PR Review

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

## 3. PR Enrichment

Enriches a pull request's title and description based on the changes.

### Triggering via Comment

Post a comment on a pull request:

```
@gemini-enrich
```

### Triggering via GitHub Actions UI

1. Navigate to **Actions** -> **PR Enrichment**.
2. Click **Run workflow**.
3. Enter the **PR number**.

---

## 4. Create Review Issues

Creates follow-up issues for bugs or technical debt identified during an AI review.

### Triggering via Comment

Post a comment on a pull request:

```
@create-review-issues
```

_Note: This command uses the artifacts from the current workflow run._

### Triggering via GitHub Actions UI

1. Navigate to **Actions** -> **Reusable Create Review Issues**.
2. Click **Run workflow**.
3. Enter the **PR number**.
4. Enter the **Workflow run ID** containing the `review-result` artifact.

---

## 5. Cost and Control Guidelines

If automatic workflows are disabled via repository variables (e.g., `GEMINI_ENABLE_TRIAGE=false` or `GEMINI_ENABLE_PR_ENRICHMENT=false`), manual triggers **will still work**. This allows the team to save costs on routine events while retaining the ability to use AI for specific, high-value tasks.

To re-enable automatic triggers, set the corresponding repository variable to `true`.
