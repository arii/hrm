# GitHub Actions Guidelines

This document outlines the standards for creating and maintaining GitHub Actions workflows in the HRM project.

## Interacting with the GitHub API

We use two primary methods for interacting with the GitHub API within our workflows: specialized actions and the `actions/github-script` action.

### 1. Specialized Actions (Concise)

For simple, single-purpose tasks that have well-maintained specialized actions, prefer using them for conciseness and readability.

- **Adding Reactions**: Use [`peter-evans/create-reaction`](https://github.com/peter-evans/create-reaction).
  - **Standard Version**: `@v4`
  - **When to use**: When the *only* purpose of a step is to add a reaction to an issue or comment.

**Example:**
```yaml
- name: Add reaction
  uses: peter-evans/create-reaction@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    comment-id: ${{ (github.event.comment && github.event.comment.id) || inputs.comment_id }}
    reaction: eyes
```

### 2. GitHub Script (Flexible)

For complex logic, multiple API interactions in a single step, or tasks where no specialized action is suitable, use [`actions/github-script`](https://github.com/actions/github-script).

- **Standard Version**: `@v7`
- **When to use**:
  - Complex conditional logic that is easier to express in JavaScript.
  - Performing multiple API calls (e.g., adding a reaction AND posting a comment).
  - Tasks that require direct access to the `github` octokit client or the `context` object.

**Example (with robust ID resolution):**
```yaml
- name: Acknowledge and Comment
  uses: actions/github-script@v7
  env:
    COMMENT_ID_INPUT: ${{ inputs.comment_id }}
  with:
    script: |
      const commentId = Number(process.env.COMMENT_ID_INPUT) || context.payload.comment?.id || 0;
      const prNumber = context.issue.number;

      if (commentId) {
        await github.rest.reactions.createForIssueComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: commentId,
          content: 'rocket'
        });
      }

      if (prNumber) {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          body: 'Processing your request...'
        });
      }
```

## Best Practices

### 1. Robust ID Resolution

When working with IDs (PR numbers, Issue numbers, Comment IDs), always assume they might be missing or provided as strings. Use the following patterns for maximum reliability:

- **Inside `github-script`**: Use `Number(process.env.VAR) || fallback || 0` and check for truthiness (e.g., `if (id && id !== 0)`).
- **In Expressions**: Be careful with direct property access on potentially null objects. Always use the `(object && object.property)` guard pattern (e.g., `(github.event.pull_request && github.event.pull_request.number)`) even inside `if:` conditions or shell scripts. Evaluation of these expressions happens before the shell command runs, and accessing a property of a missing object will cause the entire workflow run to fail.
- **Numeric Fallbacks**: For numeric IDs, prefer `0` as the standard fallback value instead of `''` (empty string). Downstream actions and scripts should explicitly check for `0` to identify invalid IDs. In shell scripts, use `if [ -n "$ID" ] && [ "$ID" != "0" ]; then ... fi`.

### 2. Avoid Script Interpolation

Never use `${{ ... }}` directly inside a `script:` block. Pass dynamic values via the `env` context and access them using `process.env`. This prevents shell injection and ensures compatibility.

## Standard Versions

To ensure consistency across the repository, we standardize on the following versions:

- `actions/github-script@v7`
- `peter-evans/create-reaction@v4`
- `actions/checkout@v4`
- `actions/setup-node@v4`
