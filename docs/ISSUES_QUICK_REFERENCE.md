# GitHub Issues - Quick Reference Guide

## 🚀 Quick Start

### For Picking an Issue

1. Go to GitHub Issues
2. Filter by your component: `component: yourteam`
3. Sort by priority and difficulty
4. Pick one marked "ready for implementation"

### For Starting Work

1. Read the full issue description
2. Review acceptance criteria
3. Comment: "I'm taking this"
4. Set yourself as assignee
5. Create a branch: `fix/issue-#1234` or `feat/issue-#1234`

### For Completing Work

1. Keep issue comments updated on progress
2. Link your PR to the issue
3. Reference issue in commit: "Fixes #1234"
4. Close when PR is merged

---

## 📋 Component Labels (for Filtering)

Quick filter commands for GitHub Issues:

### By Component

```
Frontend Work:
  component: timer
  component: notifications
  component: googleDocViewer

Backend Work:
  component: websocket
  component: authentication
  component: logger

Full-Stack Work:
  component: spotify
  component: bluetooth
  component: websocket

Testing:
  component: testing
```

### By Priority & Type

```
Quick wins:
  priority: low type: refactor

High-impact features:
  priority: high type: feature

Tech debt:
  type: refactor
```

---

## 🎯 Major Epics (Consolidation Hubs)

### #4547: Documentation

**Status:** In Progress  
**Owner:** Documentation Team  
**What:** Centralize environment variables, architecture, dev standards  
**Related:** 18+ documentation tasks

### #4530: Typography Standardization

**Status:** In Progress  
**Owner:** Frontend/Design  
**What:** Standardize dashboard heading and title styling  
**Related:** 7 typography tasks

### #4528: Environment Variables & Configuration

**Status:** In Progress  
**Owner:** Backend/DevOps  
**What:** Centralize and validate environment variable handling  
**Related:** 4+ configuration tasks

### #4455: GoogleDocViewer Enhancement

**Status:** In Progress  
**Owner:** Frontend  
**What:** Improve responsiveness, error handling, accessibility  
**Related:** 13 GoogleDocViewer tasks

---

## 📊 Current Backlog Stats

| Metric                  | Value     |
| ----------------------- | --------- |
| Total Open Issues       | 256       |
| Feature Implementations | 107 (42%) |
| Refactoring Tasks       | 47 (18%)  |
| Testing Work            | 32 (13%)  |
| Other Improvements      | 58 (23%)  |
| Bug Fixes               | 17 (7%)   |
| Accessibility           | 13 (5%)   |
| Security                | 2 (1%)    |

---

## 💡 Team-Specific Filters

### Frontend Team

Best filter: `component: timer OR component: notifications OR component: googleDocViewer`

Top 3 areas:

1. TimerControls UI state sync
2. Google Doc Viewer responsiveness
3. Notification system consolidation

### Backend Team

Best filter: `component: websocket OR component: authentication OR component: logger`

Top 3 areas:

1. WebSocket connection management
2. Authentication/token handling
3. Logging infrastructure

### Full-Stack Team

Best filter: `component: spotify OR component: bluetooth OR component: websocket`

Top 3 areas:

1. Spotify device selection & playback
2. Bluetooth HRM integration
3. WebSocket data flows

### Testing Team

Best filter: `component: testing`

Top 3 areas:

1. Test infrastructure setup
2. Component-specific test improvements
3. E2E and visual regression tests

---

## 🔗 Common Issue Workflows

### Starting a Feature

```
1. Find issue with label: priority:high type:feature
2. Check for blockers (status:blocked)
3. Review acceptance criteria
4. Create feature branch: feat/issue-#4123
5. Reference issue in commits
```

### Fixing a Bug

```
1. Find issue with label: type:bug priority:high
2. Reproduce the issue locally
3. Create fix branch: fix/issue-#4234
4. Reference issue in commits: "Fixes #4234"
5. Request review
```

### Refactoring

```
1. Find issue with label: type:refactor component:xxx
2. Review current code structure
3. Create refactor branch: refactor/issue-#4345
4. Update tests as needed
5. Ensure no behavior changes
```

---

## 📈 Monthly Health Check

Every month, teams should review:

1. **Velocity:** How many issues closed this month?
2. **Age:** Any issues older than 90 days?
3. **Quality:** Any vague or unactionable issues?
4. **Distribution:** Work spread across components?

See `docs/BACKLOG_MANAGEMENT.md` for detailed metrics.

---

## ❓ FAQ

**Q: How do I know which issues are ready?**
A: Look for issues with clear acceptance criteria. If you're unsure, comment and ask!

**Q: Can I work on multiple issues?**
A: Yes, but focus on one at a time. Only claim issues you're actively working on.

**Q: What if I find a new issue?**
A: Create it with:

- Clear, actionable title (action verb + target)
- Specific acceptance criteria
- Relevant component label
- Estimated priority

**Q: How do I update progress?**
A: Comment on the issue, link your PR, reference it in commits.

**Q: What labels should I use?**
A: At minimum:

- One `component:` label
- One `type:` label
- One `priority:` label (if known)

---

## 🔗 Related Resources

- **Full Guide:** docs/BACKLOG_MANAGEMENT.md
- **Documentation:** Issue #4547 (Epic)
- **Issues Page:** https://github.com/arii/hrm/issues

---

**Last Updated:** 2026-01-27  
**Status:** Ready for Team Use
