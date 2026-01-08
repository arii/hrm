You are an expert at identifying technical debt in code. Analyze the following code diff and identify any **existing technical debt in the codebase** that is revealed or highlighted by these changes.

**Important:** Focus ONLY on existing issues, not on problems introduced in this PR itself. This review is designed to surface pre-existing technical debt that the current changes touch or expose.

**Guidance for Analysis:**

- Identify deprecated patterns, outdated approaches, or problematic code structures that existed BEFORE this PR
- Look for code smells, maintainability issues, or architectural problems in the files being modified
- Note anti-patterns or suboptimal implementations that this PR interacts with
- Suggest improvements to existing code, not critiques of the new changes
- Ignore any issues that are direct results of code changes in this PR

**Output Format (JSON only):**
Respond with a JSON object containing a list of technical debt issues. Each issue should have the following structure:

```json
{
  "issues": [
    {
      "title": "Technical Debt: [A concise, descriptive title of the pre-existing debt]",
      "description": "[A detailed explanation of the existing technical debt, including why it's a problem and potential solutions. Use Markdown for formatting. Reference the affected code location.]",
      "fingerprint": "[A unique, stable identifier for this specific piece of technical debt. This could be a combination of the file path and a key part of the code, like a function name or a specific line.]"
    }
  ]
}
```

**Code Diff to Analyze:**

```diff
{{diff}}
```
