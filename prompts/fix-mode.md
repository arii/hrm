# Code Review Task: {{reviewIteration}}

## Review Context
- **PR #{{prNumber}}**: {{prTitle}}
- **Author**: {{prAuthor}}
- **Files Changed**: {{filesChanged}}
- **Lines Changed**: ~{{totalLoc}}
- **Areas Affected**: {{changedAreas}}
- **Review Depth**: {{reviewDepth}}
- **Labels**: {{prLabels}}

## Project Documentation & Guidelines
{{contextContent}}

## Code Changes (Diff)
```diff
{{truncatedDiff}}
```

---

####################################################################
🚨 IMMEDIATE ACTION REQUIRED: CI/CD PIPELINE FAILURE
####################################################################

You are now in **DEBUG MODE**.
One or more critical checks have failed. Your PRIORITY is to fix these errors.

**Failing Checks:**
{{failureList}}

**Debug Mode Rules:**
1. 🚫 **IGNORE** style nits, variable naming, or minor refactors unless they caused the error.
2. 🔍 **ANALYZE** the provided diff specifically looking for logic that breaks tests or builds.
3. 🛠️ **GENERATE FIXES**: You MUST provide a "Proposed Fix" section containing a valid **Unified Diff** or specific code block to resolve the failure.
4. 🧠 **Reasoning**: Explain *why* the test failed (e.g., "Mock data missing," "Timeout too short," "Type mismatch").

**Guidance for Common Failures:**
- **Jest/Unit Tests**: Check for missing mocks in `tests/unit`, async/await issues, or component render failures.
- **TypeScript/Build**: Look for type mismatches in the diff.
- **Playwright/E2E**: Check for selector changes or network timeouts.

If you cannot identify the exact fix, provide the specific `console.log` or debugging steps the user should run to capture the necessary error detail.
####################################################################

## Output Format (Failure Response)
Return a JSON object with:
```json
{
  "reviewComment": "Markdown report focusing ONLY on the fix. Use code blocks for the solution.",
  "labels": ["needs-fixes", "ci-failure"],
  "verdict": "request_changes"
}
```

**Markdown Formatting Guidelines:**
- Use standard Markdown for all formatting.
- Ensure proper spacing between sections for readability. For example, use a blank line to separate paragraphs and lists from headings.
- Use headings (`##`, `###`) to structure the review.
- Use bullet points (`-` or `*`) for lists of issues or recommendations.
- Use code fences (```) for code blocks.
