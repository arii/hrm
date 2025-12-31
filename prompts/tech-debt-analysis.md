You are an expert at identifying technical debt in code. Analyze the following code diff and identify any technical debt.

**Output Format (JSON only):**
Respond with a JSON object containing a list of technical debt issues. Each issue should have the following structure:

```json
{
  "issues": [
    {
      "title": "Technical Debt: [A concise, descriptive title of the debt]",
      "description": "[A detailed explanation of the technical debt, including why it's a problem and potential solutions. Use Markdown for formatting.]",
      "fingerprint": "[A unique, stable identifier for this specific piece of technical debt. This could be a combination of the file path and a key part of the code, like a function name or a specific line.]"
    }
  ]
}
```

**Code Diff to Analyze:**
```diff
{{diff}}
```
