# PR Discovery & Knowledge Extraction Workflow

## Overview

This document describes a systematic workflow for analyzing recently closed Pull Requests to extract knowledge discoveries and translate them into actionable, comprehensive issues. This process ensures that lessons learned from PR reviews and implementation attempts are captured and addressed systematically.

## Why PR Discovery Matters

When PRs are closed (especially without merging), they often contain valuable insights:

- **Implementation Failures**: Code that didn't work reveals architectural constraints
- **Review Feedback**: Detailed audits from reviewers highlight systemic issues
- **Build Failures**: Compilation errors expose infrastructure or design problems
- **Hidden Dependencies**: Interdependencies between features become apparent
- **Technical Debt**: Problems requiring follow-up work are often documented in comments

Without systematic extraction, these insights are lost in closed PR history.

## Workflow Steps

### Phase 1: Identify Recent Closed PRs

**Goal**: Find PRs closed in the last 1-2 weeks with substantial comment history

**Tools**: GitHub PR search and filtering

```bash
# Find recently closed PRs (not merged)
gh pr list --state closed --sort updated --limit 20

# Look specifically for PRs closed without merging
# (merge_commit_sha field is empty or null)
```

**Selection Criteria**:

- [ ] PR closed in last 1-2 weeks
- [ ] Has significant comment history (5+ comments)
- [ ] Shows evidence of review feedback or build failures
- [ ] Was NOT merged (indicates problems encountered)

### Phase 2: Analyze PR Comments

**Goal**: Extract insights from review feedback and discussions

**Process**:

1. **Fetch PR Comments**

   ```bash
   gh pr view {PR_NUMBER} --comments
   ```

2. **Categorize Comments**:
   - **Review Feedback**: Detailed analysis from reviewers (automated or human)
   - **Build Failures**: Compilation errors, test failures, deployment issues
   - **Discussion**: Back-and-forth about implementation approach
   - **Warnings**: Comments about technical debt or future work

3. **Extract Key Insights**:
   - What went wrong? (root causes)
   - Why was the PR closed? (blockers, fundamental issues)
   - What follow-up work is needed? (explicit or implied)
   - What patterns emerged? (architectural issues, systemic problems)

**Example Insight Categories**:

- **Architecture Conflicts**: "Cannot export metadata from use client components"
- **Performance Regressions**: "Disabling cache causes X% slower builds"
- **Missing Features**: "Auto-start functionality not implemented as required"
- **Integration Issues**: "WebSocket provider scope requires restructuring"

### Phase 3: Identify Patterns

**Goal**: Find systemic issues across multiple PRs

**Questions to Ask**:

- [ ] Do multiple PRs have the SAME failure pattern?
- [ ] Are there recurring error messages?
- [ ] Do reviewers mention the same concerns in different PRs?
- [ ] Do PRs reference common dependencies or architecture?

**Example Pattern**:

> PRs #1417, #1454, #1436 all failed with "Cannot export metadata from use client components"
> → This indicates a systematic build architecture problem, not individual implementation issues

### Phase 4: Create Comprehensive Issues

**Goal**: Transform discoveries into actionable, well-researched issues

**Issue Structure**:

```markdown
## Overview

- Summary of what was discovered
- Why it matters
- Connection to recent PRs

## Problem Statement

- Specific issues encountered
- Root causes (as discovered through PRs)
- Impact on development/users

## Root Cause Analysis

- Technical analysis based on PR failures
- Architectural constraints discovered
- Historical context

## Comprehensive Solution

- Complete implementation strategy
- Multiple phases with clear deliverables
- Testing and validation approach

## Acceptance Criteria

- Specific, measurable outcomes
- Build/test requirements
- UX/performance expectations

## Implementation Plan

- Phased approach (Phase 1, 2, 3, 4)
- Clear dependencies between phases
- Timeline estimates

## Priority

- Based on blocker status from PRs
- Impact on active development
- User-facing vs. technical debt
```

**Key Principles**:

1. **Be Specific**: Reference actual PR numbers and errors
2. **Explain Cause**: Don't just describe the problem, explain why it happened
3. **Provide Solutions**: Include detailed implementation strategy
4. **Set Standards**: Establish architecture/code standards for future work
5. **Enable Repetition**: Write so others can follow the same approach

### Phase 5: Close/Consolidate Existing Issues

**Goal**: Prevent duplicate work and focus the backlog

**Process**:

1. **Identify Superseded Issues**
   - Old issues describing incomplete features from closed PRs
   - Issues addressing same problem but more narrowly
   - Outdated issues with incorrect approaches

2. **Decide on Each Issue**:
   - **Close**: If completely superseded by new comprehensive issue
   - **Consolidate**: If related to a broader epic issue
   - **Reference**: If providing additional context, add reference comment
   - **Keep**: If addressing distinct problem not covered by new issues

3. **Write Closure Comments**

   ```markdown
   Closing in favor of comprehensive issue #{NEW_ISSUE} which addresses
   this problem based on detailed analysis from PR #{PR_NUMBER}.

   The new issue provides [specific improvements]:

   - Root cause analysis instead of just symptom description
   - Complete implementation strategy
   - Clear acceptance criteria based on actual failures
   ```

## Tools & Commands

### Fetching PR Information

```bash
# Get PR list with specific fields
gh pr list --state closed --sort updated --limit 30 \
  --json number,title,updatedAt,comments,closedAt

# Get full PR details including body
gh pr view {PR_NUMBER}

# Get PR comments for analysis
gh pr view {PR_NUMBER} --comments | head -50

# Check if PR was merged
gh pr view {PR_NUMBER} --json mergeCommitSha
```

### Creating Issues Programmatically

```bash
# Create issue with detailed body
gh issue create \
  --title "Issue Title" \
  --body "Issue body with markdown" \
  --label "bug,architecture"

# Close issue with comment
gh issue close {ISSUE_NUMBER} \
  --comment "Closure reason referencing new issue"

# Add comment to existing issue
gh issue comment {ISSUE_NUMBER} \
  --body "Additional context or relation to new work"
```

## Real-World Example: PR Discovery Session

### Session Overview

**Date**: December 14, 2025  
**Recently Closed PRs Analyzed**: #1480, #1417, #1454, #1436, #1466, #1471, #1473, #1478, #1479

### Discoveries Made

**PR #1480 - Cache Failure**

- Issue: pnpm cache downloads failing with "operation canceled"
- Workaround: Disabling cache (performance regression)
- Insight: Underlying CI/CD infrastructure problem, not simple cache configuration
- Action: Created comprehensive issue #1489 for infrastructure investigation

**PR #1417 - LoadingIndicator Failures**

- Issue: Multiple failed attempts to integrate LoadingIndicator with LoadingContext
- Root Cause: Next.js 16 metadata export conflicts with use client components
- Impact: Blocks all context-dependent component features
- Action: Created comprehensive issue #1490 with architectural solution

**PR #1436 - Auto-Start Complexity**

- Issue: Complex requirements around manual vs. automatic workout start
- Root Cause: Unclear state management requirements from original issue
- Impact: Multiple incomplete implementation attempts
- Action: Created comprehensive issue #1493 with state machine design

**Common Pattern Across PRs #1417, #1454, #1436**

- Issue: Build failures related to client/server component boundaries
- Cause: Next.js 16 stricter enforcement of component type rules
- Impact: Multiple PRs blocked on same architectural issue
- Action: Created comprehensive issue #1494 establishing build standards

### Issues Created

- #1489: CI/CD Infrastructure (High Priority)
- #1490: LoadingContext Integration (High Priority)
- #1493: Workout Auto-Start (Medium-High Priority)
- #1494: Build Architecture (Critical Priority)

### Issues Closed

- #1070, #1370, #1373, #1376, #1378, #1379, #1380, #1381, #1387, #1428
- Total: 10 issues consolidated, reducing backlog noise

## Best Practices

### 1. Look for Patterns, Not Just Individual Issues

- Single PR failure = implementation problem
- Multiple PRs with same issue = systemic/architectural problem

### 2. Dig Deeper Than Surface Errors

- "Build failed" → Why? Network? Dependencies? Architecture?
- "Test failed" → Root cause or symptom of larger problem?
- "Needs improvement" → What specific standards are missing?

### 3. Write Issues for Automation/Repeatability

- Include detailed implementation steps
- Establish standards for future similar work
- Enable others to follow the same approach

### 4. Reference Original Context

- Link to PR numbers and specific comments
- Quote relevant review feedback
- Show concrete error messages and logs

### 5. Consolidate Aggressively

- Eliminate fragmented issues in favor of comprehensive ones
- Close issues superseded by better solutions
- Group related tasks into coherent epics

## Frequency & Timing

**Recommended Schedule**:

- **Weekly**: Quick scan of newly closed PRs (15 minutes)
- **Bi-weekly**: Deep analysis session (1-2 hours)
  - Analyze 5-10 recently closed PRs
  - Extract insights and patterns
  - Create/update comprehensive issues
  - Consolidate duplicate/redundant issues

**Trigger Events** (Do immediate analysis):

- Multiple PRs closed in same day
- PR closed with "needs-improvement" label
- Build/CI failures in multiple PRs
- Review feedback mentioning systemic issues

## Integration with Development Process

### For Developers

- Check "Recently Discovered" issues in backlog
- Use comprehensive issues as task specifications
- Reference issue details during implementation

### For Reviewers

- Note patterns in review feedback
- Flag systemic issues for discovery process
- Reference similar previous issues

### For Project Managers

- Use PR discovery to identify technical debt
- Prioritize based on blocker status
- Track time between discovery and resolution

## Related Documentation

- `CONTRIBUTING.md` - Development guidelines
- `DEVELOPMENT.md` - Development standards
- `DESIGN_GUIDELINES.md` - Design patterns
- `REVIEW_CHECKLIST.md` - PR review standards

## Questions & Support

For questions about this workflow:

1. Check this document for step-by-step guidance
2. Review the "Real-World Example" section for concrete implementation
3. Reference the Tools section for specific commands
4. Consult git history of issues created through this process

---

**Last Updated**: December 14, 2025  
**Next Review**: December 28, 2025
