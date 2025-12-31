# Code Review Task: {{reviewIteration}}

## Review Context
- **PR #{{prNumber}}**: {{prTitle}}
- **Author**: {{prAuthor}}
- **Files Changed**: {{filesChanged}}
- **Lines Changed**: ~{{totalLoc}}
- **Areas Affected**: {{changedAreas}}
- **Review Depth**: {{reviewDepth}}
- **Labels**: {{prLabels}}

- **Linked Issue #{{issueNumber}}**: {{issueTitle}}

## Review History
- **Previous Reviews**: {{reviewCount}}
- **Resolved Comments**: {{resolvedCount}}
- **Changes Requested**: {{changesRequested}}

### Focus Areas for Re-Review:
1. Verify that previous feedback has been addressed
2. Check for introduction of new issues
3. Assess overall code quality improvement
4. Determine if the PR is ready for approval

### Previous Review Feedback:
{{previousReviews}}

⚠️ **TEST COVERAGE ALERT**: Source code was modified without corresponding test changes.

✅ **Test Coverage**: Tests were updated ({{testFiles}})

## Issue Description
{{linkedIssueBody}}

## Commit Messages (Development Intent)
{{commitMessages}}

## Project Documentation & Guidelines
{{contextContent}}

## Code Changes (Diff)
```diff
{{truncatedDiff}}
```

---

## Review Instructions

### Re-Review Guidelines:
1. **Verification First**: Check if previous concerns were addressed
2. **New Issues**: Identify any regressions or new problems introduced
3. **Progressive Approval**: If most issues resolved and only minor items remain, indicate near-approval status
4. **Focus on Critical**: At this stage, focus on blocking issues only unless asking for major refactoring
5. **No Issues Found**: If the changes are perfect and no issues are found, YOU MUST explicitly describe what you verified and why it is correct. Do not output an empty review.

### Output Format for Re-Review:
- Start with a summary of what was fixed from previous review
- List any remaining issues (categorize as blocking vs. nice-to-have)
- If near approval, explicitly state "✅ Ready for approval pending: [list minor items]"
- Provide specific, actionable feedback for any remaining concerns
- If NO issues found: "✅ Verified [Specific Change]. No regressions found. Ready for approval."

### Detailed Review Guidelines (Small Change):
Review every aspect thoroughly:
1. **Code Quality**: Readability, maintainability, adherence to patterns
2. **Architecture**: Proper separation of concerns, appropriate abstractions
3. **Security**: Input validation, auth/auth, data exposure
4. **Performance**: Inefficiencies, N+1 queries, memory leaks
5. **Testing**: Coverage of edge cases, test quality
6. **Documentation**: Code comments, type definitions, API docs

### Standard Review Guidelines (Medium Change):
Focus on key areas:
1. **Correctness**: Does the code solve the intended problem?
2. **Architecture**: Are changes well-structured and maintainable?
3. **Security & Performance**: Any critical issues?
4. **Testing**: Are key paths covered?
5. **Breaking Changes**: Backward compatibility concerns?

### Focused Review Guidelines (Large Change):
Prioritize high-impact areas:
1. **Architecture**: Overall design and structure
2. **Critical Paths**: Security, data integrity, performance bottlenecks
3. **Public APIs**: Interface design and breaking changes
4. **Test Strategy**: Are high-risk areas covered?

Note: For large changes, consider suggesting to break into smaller PRs if feasible.

### Output Format:
Provide a structured review with:
1. **Summary**: High-level assessment of the change
2. **Strengths**: What's done well
3. **Issues**: Categorized by severity (blocking, important, nice-to-have)
4. **Test Coverage**: Assessment of test quality/coverage
5. **Recommendations**: Specific, actionable improvements
6. **Verdict**: Approve / Request Changes / Comment

## Project Context
- This is a Next.js/TypeScript HRM (Heart Rate Monitor) application
- Focus on real-time data handling and WebSocket performance
- Security is critical (authentication, data privacy)
- Maintain backward compatibility unless explicitly breaking change
- Follow patterns established in DEVELOPMENT.md and DESIGN_GUIDELINES.md

## Known Areas of Technical Debt (from audit):
When reviewing, be especially vigilant about:
- Callback hell in server.ts (prefer async/await)
- Type safety (avoid 'any', use proper TypeScript types)
- Error handling (ensure proper try/catch and error messages)
- WebSocket connection management (prevent memory leaks)
- Authentication state consistency

## Response Format (JSON)
Return a JSON object with:
```json
{
  "reviewComment": "Your formatted markdown review comment",
  "labels": ["label1", "label2"],
  "verdict": "approve" | "request_changes" | "comment"
}
```

Make your feedback:
- **Specific**: Reference exact file/line numbers
- **Actionable**: Provide concrete suggestions
- **Constructive**: Focus on improvement, not criticism
- **Contextual**: Consider the change in the broader codebase
- **Balanced**: Acknowledge good practices while noting improvements

**Markdown Formatting (STRICT):**
- You MUST add **TWO NEWLINES** (`\n\n`) before every header.
- You MUST add **ONE NEWLINE** (`\n`) after every header.
- Do not clump sections together.
- Ensure lists are properly spaced.
