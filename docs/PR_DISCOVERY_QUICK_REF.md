# PR Discovery Quick Reference

## 30-Second Overview

Analyze recently closed PRs → Extract insights → Create comprehensive issues → Close redundant issues

## Quick Checklist (Weekly)

- [ ] Check recently closed PRs (`gh pr list --state closed --sort updated --limit 20`)
- [ ] Scan for common failure patterns (build errors, review feedback)
- [ ] Identify systemic issues (multiple PRs, same problem)
- [ ] Note explicit follow-up tasks in PR comments

## Deep Analysis (Bi-Weekly, 1-2 hours)

### Step 1: Collect Data (15 min)

```bash
# Get recent closed PRs
gh pr list --state closed --sort updated --limit 10

# Fetch comments for each PR
for pr in 1480 1417 1454 1436; do
  echo "=== PR #$pr ==="
  gh pr view $pr --comments
done
```

### Step 2: Analyze Comments (20 min)

Look for:

- ❌ Build failures / error messages
- 🎯 Review feedback with "CRITICAL" or "MUST" language
- 📋 Explicit "follow-up" or "next phase" mentions
- 🔄 Same issue across multiple PRs

### Step 3: Identify Patterns (15 min)

Ask:

- Do 2+ PRs have the same error?
- Is this a symptom of bigger architectural problem?
- What would prevent this issue in future?

### Step 4: Create Comprehensive Issues (30 min)

For each pattern:

```markdown
## Overview

[What was discovered and why it matters]

## Problem Statement

[Specific failures from PRs with numbers]

## Root Cause Analysis

[Why did it happen? Architecture? Process?]

## Solution

[Complete implementation strategy, multiple phases]

## Acceptance Criteria

[Specific measurable outcomes]

## Priority

[Based on PR blocker status]

## Related

- PR #XXXX
- PR #YYYY
- Issue #ZZZ
```

### Step 5: Consolidate Issues (15 min)

For each old/similar issue:

```bash
# Close with reference to new comprehensive issue
gh issue close {OLD_ISSUE} --comment \
  "Closing in favor of #NEW_ISSUE which addresses this
   based on analysis from PR #XXXX with complete solution"
```

## Key Insight Recognition

### Single PR Failure

> "Build failed because variable named wrong"

- Action: Fix in that PR, no discovery needed

### Systemic Pattern

> "Build failed in PR #1417, #1454, #1436 - all same error about use client metadata"

- Action: Create comprehensive architectural issue
- Action: Close individual workaround issues

### Blocked Feature

> "Auto-start functionality needed but PR #1436 revealed complex state requirements"

- Action: Create detailed state management issue with example
- Action: Set standard for similar features

### Performance Regression

> "PR #1480 disabled cache for stability, causing X% slower builds"

- Action: Create infrastructure investigation issue
- Action: Establish performance monitoring standards

## Common Commands

```bash
# Find PRs with no merge (closed without merging)
gh pr list --state closed --sort updated --json number,title,mergeCommitSha | \
  jq '.[] | select(.mergeCommitSha == null)'

# Get PR comments with context
gh pr view 1480 --comments | grep -A 5 -B 5 "CRITICAL"

# Create issue from template
gh issue create -t pr-discovery --template

# Quick close with reference
gh issue close 1374 -c "Closing - superseded by #1490"

# Add label to group related issues
gh issue edit 1489 --add-label "infrastructure,discovered"
```

## What to Look For

### Red Flags 🚩

- "Cannot export metadata from use client" (architectural issue)
- Same error in 2+ PRs (systemic problem)
- "Workaround" language (indicates technical debt)
- "Follow-up needed" or "TODO" (incomplete work)
- Build failures blocking PRs (infrastructure problem)

### Positive Indicators ✅

- Clear reviewer feedback with suggestions
- Specific error messages (easier to diagnose)
- Links between issues (shows understanding)
- Performance metrics mentioned (trackable)

## Issue Quality Checklist

Before creating issue:

- [ ] References specific PR(s) with numbers
- [ ] Includes actual error messages/logs
- [ ] Explains WHY (not just what failed)
- [ ] Has multiple implementation phases
- [ ] Sets standards for future similar work
- [ ] Includes acceptance criteria with specifics
- [ ] Prioritized based on blocker status

## Tracking Impact

After discovery session:

- **Issues Created**: # new comprehensive issues
- **Issues Closed**: # redundant/superseded issues
- **Patterns Found**: # distinct systemic issues
- **Blockers Identified**: # blocking active PRs
- **Technical Debt**: # follow-up tasks identified

---

## Template: Issue Creation

```markdown
## Overview

Based on analysis of PR #{PR_NUM}, we discovered...

## Problem Statement

Multiple PRs encountered: [error/issue description]

## Root Cause Analysis

[Explanation of why this happened]

## Solution

Phase 1: [what, why, acceptance criteria]
Phase 2: [what, why, acceptance criteria]
Phase 3: [what, why, acceptance criteria]

## Priority

[Critical/High/Medium based on blocker status]

## Related

- PR #{PR_NUM}
- PR #{PR_NUM}
- Issue #{ISSUE_NUM}
```

## When to Do Discovery

**Weekly Quick Scan**: Monday or Friday (15 min)
**Deep Analysis**: Every other week, dedicated time (1-2 hours)
**Immediately After**: Large feature PRs closing, release-related PRs, infrastructure PRs

---

**Version**: 1.0  
**Last Updated**: December 14, 2025
