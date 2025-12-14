# Agent Guide: PR Discovery & Knowledge Extraction

## For AI Assistants (Jules, GitHub Copilot, etc.)

This guide explains how to systematically extract valuable insights from closed Pull Requests and translate them into actionable, comprehensive issues.

## Why This Matters

When you encounter closed PRs with extensive comments, you're looking at concentrated knowledge about:

- **What failed**: Build errors, test failures, deployment issues
- **Why it failed**: Root causes discovered during review
- **What's blocking**: Architectural constraints, missing prerequisites
- **What's needed**: Follow-up work, standards, improvements

Extracting this knowledge prevents the same problems from recurring and helps future implementations succeed.

## Your Role in PR Discovery

### As an Assistant During Development

1. **Notice When PRs Close Without Merging**
   - Alert the team: "PR #X was closed - it contains valuable insights about [issue]"
   - Offer to analyze the comments if the team requests

2. **Pay Attention to Review Feedback**
   - When reviewers use phrases like "CRITICAL", "MUST", "architectural issue"
   - When build logs show repeated failures
   - When reviewers suggest follow-up work

3. **Flag Patterns**
   - If you see same error in multiple PRs, mention it
   - If same architectural issue blocks multiple features, highlight it
   - If performance regressions appear, track them

### As an Assistant During Discovery Sessions

When asked to analyze closed PRs for insights:

#### Step 1: Fetch and Scan

```bash
# Get list of recently closed PRs
gh pr list --state closed --sort updated --limit 20

# For promising candidates, get comments
gh pr view {PR_NUMBER} --comments
```

**Look for**:

- Comments with technical detail (10+ lines of explanation)
- Build failures with error messages
- Multiple comment exchanges indicating complexity
- "CRITICAL", "MUST", "architectural", "follow-up" language

#### Step 2: Categorize Findings

For each PR, identify:

```
Title: [PR Title]
Number: [PR #]
Status: [merged/closed-without-merge]

Build Failures:
- [specific error]
- [specific error]

Architecture Issues:
- [issue description]

Review Feedback:
- [key concern from reviewer]

Explicit Follow-up Work:
- [tasks mentioned in comments]

Root Cause (if identifiable):
- [why did this fail?]
```

#### Step 3: Identify Patterns

```
Pattern: Same issue in multiple PRs?
PRs: #1417, #1454, #1436 all failed with "Cannot export metadata from use client"
→ This is a SYSTEMIC ISSUE (architecture-level)

Pattern: Single PR workaround for bigger problem?
PR: #1480 disabled cache as workaround for "operation canceled" errors
→ This requires ROOT CAUSE INVESTIGATION

Pattern: Complex requirements discovered through implementation?
PR: #1436 revealed auto-start functionality needs sophisticated state management
→ This requires COMPREHENSIVE SOLUTION (not quick fix)
```

#### Step 4: Create Comprehensive Issues

Transform patterns into issues using this structure:

```markdown
## Overview

[1-2 sentences about what was discovered]

## Problem Statement

Based on analysis of PRs #{list}, we found:

- [Specific failure in PR #X]
- [Specific failure in PR #Y]
- [Pattern across PRs]

## Root Cause Analysis

[Explain WHY this happened - don't just describe the failure]

### Root Causes

1. [Technical root cause]
2. [Architectural root cause]
3. [Process/standards root cause]

## Comprehensive Solution

### Phase 1: [Name]

[What to do, why, expected outcome]

### Phase 2: [Name]

[What to do, why, expected outcome]

### Phase 3: [Name]

[What to do, why, expected outcome]

## Acceptance Criteria

### Phase 1

- [ ] Specific measurable outcome
- [ ] Build/test requirement
- [ ] Code quality standard

### Phase 2

- [ ] Specific measurable outcome
- [ ] Integration requirement
- [ ] Performance requirement

### Phase 3

- [ ] Specific measurable outcome
- [ ] Documentation requirement
- [ ] Maintenance requirement

## Implementation Notes

### Key Insights from PR Analysis

- [Specific discovery from PR #X]
- [Specific discovery from PR #Y]
- [Pattern observed across PRs]

### Why Previous Attempts Failed

- [PR #X failed because...]
- [PR #Y failed because...]

### How This Solution Prevents Future Failures

- [Standard #1 to prevent issue]
- [Standard #2 to prevent issue]
- [Monitoring/validation to prevent issue]

## Priority

[Critical/High/Medium based on blocker status]

## Related

- PR #XXXX [link to first PR]
- PR #YYYY [link to second PR]
- Issue #ZZZZ [link to related issue]
```

#### Step 5: Recommend Issue Consolidations

Identify and suggest closing issues that are:

- Superseded by the new comprehensive issue
- Addressing the same problem less completely
- Conflicting with the new approach

```
Recommend closing:
- #1374 (old LoadingIndicator issue)
  → Superseded by #1490 which provides complete architectural solution
  → Closure comment: "Closing in favor of #1490 which addresses this
    based on detailed analysis from PR #1417 with complete implementation strategy"
```

## Quality Standards for Discovery Work

Your issue creation should:

- [ ] Reference specific PR numbers
- [ ] Include actual error messages/logs (not paraphrased)
- [ ] Explain ROOT CAUSES (why it failed)
- [ ] Provide COMPLETE implementation strategy (not just "fix the bug")
- [ ] Include multiple phases with clear dependencies
- [ ] Establish standards for future similar work
- [ ] Have specific, measurable acceptance criteria
- [ ] Be prioritized based on blocker status

## Example: Real PR Discovery Session

### Raw Data

```
PR #1480 - pnpm cache failures
Comments show: "operation canceled" error during cache download
Workaround applied: Disabled cache (performance regression)
Reviewer feedback: "This is a band-aid, root cause must be investigated"

PR #1417, #1454, #1436 - Next.js build failures
Comments show: "Cannot export metadata from components marked with 'use client'"
Multiple attempts with same architectural issue
Reviewer feedback: "Layout architecture needs restructuring"
```

### Analysis

```
Pattern Identified:
- PR #1480 = Infrastructure problem (cache failures)
- PRs #1417, #1454, #1436 = Architecture problem (client/server boundaries)
- These are TWO DISTINCT SYSTEMIC ISSUES

Issue 1 requires: Infrastructure investigation + performance monitoring
Issue 2 requires: Build architecture standards + layout restructuring
```

### Issues Created

```
Issue #1489: CI/CD Infrastructure Investigation
- Root cause: Why are pnpm caches failing?
- Solution: Investigation plan + monitoring strategy
- Outcome: Restored caching with improved stability

Issue #1494: Build Architecture Standards
- Root cause: Next.js 16 stricter component boundaries
- Solution: Clear standards for server/client separation
- Outcome: Prevents future client/server conflicts
```

## Commands for PR Discovery

```bash
# Get recent closed PRs
gh pr list --state closed --sort updated --limit 30

# Get PR with all context
gh pr view {PR_NUMBER}

# Get only comments (useful for analysis)
gh pr view {PR_NUMBER} --comments | less

# Create issue from command line
gh issue create \
  --title "Your Issue Title" \
  --body "$(cat /tmp/issue_body.md)" \
  --label "bug,architecture"

# Close issue with reference
gh issue close {OLD_ISSUE_NUMBER} \
  --comment "Closing in favor of #NEW_ISSUE_NUMBER
which provides comprehensive solution based on PR analysis"

# Add comment to issue for additional context
gh issue comment {ISSUE_NUMBER} \
  --body "Additional context: Related to PR #XXXX"
```

## What NOT to Do

❌ Create separate issues for each PR failure (even if same error)
✅ Create ONE comprehensive issue addressing the pattern

❌ Just describe the problem
✅ Explain WHY it's a problem and HOW to prevent it

❌ Create vague issues like "Fix build"
✅ Create specific issues with concrete success criteria

❌ Close old issues without explanation
✅ Close with detailed comment explaining why and what supersedes it

❌ Miss root causes (stop at "it failed")
✅ Dig into WHY it failed (architecture? process? standards?)

## When to Do Discovery Work

### Weekly Quick Scans (15 minutes)

- Monday or Friday
- Check for newly closed PRs
- Note patterns for deeper analysis

### Bi-Weekly Deep Analysis (1-2 hours)

- Dedicated time slot
- Analyze 5-10 recently closed PRs
- Create comprehensive issues
- Consolidate duplicates

### Immediate (Within 24 hours)

- When multiple PRs close on same day
- When PR has "needs-improvement" label
- When build/CI failures affect multiple PRs
- When reviewer mentions systemic issues

## Success Indicators

Your PR discovery work is successful when:

- ✅ New comprehensive issues have clear implementation paths
- ✅ Issues reference specific PR numbers and errors
- ✅ Root causes are explained (not just symptoms)
- ✅ Old/redundant issues are closed
- ✅ Future implementations can reference these standards
- ✅ Team can repeat the same issues less frequently
- ✅ Backlog stays focused on most important problems

## Related Documentation

- `docs/PR_DISCOVERY_WORKFLOW.md` - Complete workflow guide
- `docs/PR_DISCOVERY_QUICK_REF.md` - Quick checklists and commands
- `DEVELOPMENT.md` - Development standards and guidelines
- `CONTRIBUTING.md` - Contribution guidelines

---

**Remember**: The goal is not just to document problems, but to extract knowledge
that prevents the same problems from happening again.

**Last Updated**: December 14, 2025
