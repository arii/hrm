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
    comment-id: ${{ github.event.comment.id }}
    reaction: eyes
```

### 2. GitHub Script (Flexible)

For complex logic, multiple API interactions in a single step, or tasks where no specialized action is suitable, use [`actions/github-script`](https://github.com/actions/github-script).

- **Standard Version**: `@v7`
- **When to use**:
  - Complex conditional logic that is easier to express in JavaScript.
  - Performing multiple API calls (e.g., adding a reaction AND posting a comment).
  - Tasks that require direct access to the `github` octokit client or the `context` object.

**Example:**
```yaml
- name: Acknowledge and Comment
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.reactions.createForIssueComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: context.payload.comment.id,
        content: 'rocket'
      });
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: 'Processing your request...'
      });
```

## Standard Versions

To ensure consistency across the repository, we standardize on the following versions:

- `actions/github-script@v7`
- `peter-evans/create-reaction@v4`
- `actions/checkout@v4`
- `actions/setup-node@v4`
