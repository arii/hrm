# GitHub Issues Backlog Management Guide

## Overview

This document outlines the structure and best practices for managing the HRM Dashboard GitHub issues backlog. After a comprehensive audit, the backlog has been cleaned, consolidated, and organized for efficient team planning and execution.

## Current Status (as of 2026-01-27)

- **Total Open Issues:** 256
- **Quality Level:** 100% actionable (no vague issues)
- **Organization:** Epic-based with component labels
- **Cleanup Completed:** 44+ issues removed as stale/low-value

## Issue Categories & Distribution

### By Work Type

| Type                   | Count | %   | Examples                                                     |
| ---------------------- | ----- | --- | ------------------------------------------------------------ |
| Feature Implementation | 107   | 42% | Bluetooth HRM, Spotify Integration, WebSocket enhancements   |
| Refactoring            | 47    | 18% | Code modularity, hook consolidation, constant centralization |
| Testing                | 32    | 13% | Unit tests, E2E tests, visual regression tests               |
| Improvements           | 58    | 23% | UX enhancements, logging, documentation updates              |
| Bug Fixes              | 17    | 7%  | Token expiry, UI state sync, calorie tracking                |
| Accessibility          | 13    | 5%  | WCAG 2.1 AA compliance, semantic HTML                        |
| Security               | 2     | 1%  | Token management, data redaction                             |
| Epics                  | 4     | 2%  | Consolidation hubs for major initiatives                     |

### By Component

| Component            | Typical Issues                                        |
| -------------------- | ----------------------------------------------------- |
| Bluetooth HRM        | Integration tests, reconnection logic, data buffering |
| Spotify Integration  | Device selection, playback control, auth handling     |
| WebSocket Management | Heartbeat, session cleanup, memory leak prevention    |
| TimerControls        | UI state sync, optimistic updates, refactoring        |
| Notifications        | System consolidation, styling, test coverage          |
| Google Doc Viewer    | Error handling, responsiveness, URL management        |
| Logger               | Configuration, environment awareness, redaction       |
| Authentication       | NextAuth integration, token management, security      |

## Epic Structure

### Active Epics (Consolidation Hubs)

#### #4547: Documentation Epic

- **Goal:** Centralize all project documentation
- **Scope:** Environment variables, architecture, development standards
- **Related Issues:** 18+ consolidated doc tasks
- **Owner:** Documentation team

#### #4530: Typography Standardization

- **Goal:** Standardize dashboard heading and title styling
- **Scope:** MUI theme integration, h1-h3 hierarchy, consistent typography
- **Related Issues:** 7 typography-related tasks
- **Owner:** Frontend/Design team

#### #4528: Environment Variables & Configuration

- **Goal:** Centralize and validate environment variable handling
- **Scope:** Zod validation, documentation, runtime checks
- **Related Issues:** 4+ env-related tasks
- **Owner:** Backend/DevOps team

#### #4455: GoogleDocViewer Enhancement

- **Goal:** Improve responsiveness, error handling, testing
- **Scope:** Dynamic height, iframe loading, accessibility
- **Related Issues:** 13 GoogleDocViewer-related tasks
- **Owner:** Frontend team

## Component Labeling System

Use these labels for filtering and team assignment:

```
component: bluetooth      → Bluetooth HRM integration
component: spotify        → Spotify integration & playback
component: websocket      → WebSocket server & client
component: timer          → Timer controls & UI sync
component: notifications  → Alert/notification system
component: authentication → Auth flows & token management
component: googleDocViewer → Document viewer component
component: logger         → Logging infrastructure
component: testing        → Test infrastructure & coverage
```

## Recommended Team Organization

### Frontend Team

- **Primary:** TimerControls, Google Doc Viewer, Notifications, Logger
- **Secondary:** Spotify device UI, Bluetooth status display
- **Labels:** `component: timer`, `component: googleDocViewer`, `component: notifications`

### Backend Team

- **Primary:** WebSocket management, Authentication, Logger
- **Secondary:** Bluetooth device management
- **Labels:** `component: websocket`, `component: authentication`, `component: logger`

### Full-Stack Team

- **Primary:** Spotify integration, Bluetooth HRM
- **Secondary:** Timer state sync, WebSocket data flows
- **Labels:** `component: spotify`, `component: bluetooth`, `component: websocket`

### Testing Team

- **Primary:** Test infrastructure, E2E coverage, Visual regression
- **Secondary:** Component-specific test improvements
- **Labels:** `component: testing`, + specific component labels

## Workflow for Working on Issues

### 1. Issue Selection

- Filter by epic for major initiatives
- Filter by component for team focus
- Check priority/difficulty labels
- Verify "ready for implementation" status

### 2. Before Starting Work

- [ ] Read full issue description
- [ ] Review acceptance criteria
- [ ] Check for related/linked issues
- [ ] Comment to claim the issue
- [ ] Set yourself as assignee

### 3. During Implementation

- [ ] Keep issue comments updated
- [ ] Link PRs to the issue
- [ ] Reference issue in commit messages (e.g., "Fixes #4547")

### 4. Closing an Issue

- Link to merged PR
- Verify all acceptance criteria met
- Close the issue when PR is merged

## Priority & Difficulty Estimation

### Priority Levels

- **Critical:** System stability, security, data integrity
- **High:** Core features, user-facing functionality
- **Medium:** Enhancements, nice-to-have features
- **Low:** Minor improvements, refactoring, tech debt

### Difficulty Levels

- **XS (Extra Small):** 1-2 hours, simple fixes
- **S (Small):** 2-4 hours, straightforward implementation
- **M (Medium):** 4-8 hours, moderate complexity
- **L (Large):** 8-16 hours, significant work
- **XL (Extra Large):** 16+ hours, epics and major initiatives

## Best Practices

### Issue Creation

1. Use clear, actionable titles (action verb + target)
2. Include context and background
3. Define specific acceptance criteria
4. Link to related issues
5. Add appropriate component labels
6. Estimate priority and difficulty

### Issue Updates

1. Comment when making progress
2. Link merged PRs to the issue
3. Update related issue statuses
4. Close when complete

### Backlog Maintenance

1. Review and close stale issues monthly
2. Update epic progress regularly
3. Reassess priorities quarterly
4. Consolidate duplicate issues immediately

## Filtering Examples

### All Bluetooth work

```
component: bluetooth
```

### High-priority features for next sprint

```
priority: high type: feature
```

### Refactoring work for a specific component

```
component: spotify type: refactor
```

### Testing improvements

```
component: testing
```

### Accessibility compliance

```
enhancement type: feature label: accessibility
```

## Common Queries

### Issues blocking deployment

```
status: blocked priority: critical
```

### Good first issues for new contributors

```
label: good first issue difficulty: xs
```

### Tech debt items

```
type: refactor -status: done
```

### Documentation needs

```
type: documentation -status: done
```

## Metrics & Health Indicators

### Monthly Backlog Health Check

Track these metrics to ensure ongoing quality:

1. **Closed vs. New Issues Ratio**
   - Target: >1.0 (closing more than adding)
   - Indicates: Productive work velocity

2. **Average Issue Age**
   - Target: <90 days
   - Indicates: Backlog is not stagnating

3. **Unactionable Issues**
   - Target: 0 (0%)
   - Indicates: Backlog quality

4. **Epic Progress**
   - Track: Issues closed / Total in epic
   - Indicates: Initiative completion

5. **Component Distribution**
   - Monitor: Work spread across components
   - Indicates: Balanced effort allocation

## Related Documentation

- See #4547 (Documentation Epic) for detailed architecture docs
- See #4528 (Environment Variables) for config management
- See #4530 (Typography) for design system info
- See #4455 (GoogleDocViewer) for component-specific guidance

---

**Last Updated:** 2026-01-27  
**Owner:** Engineering Team  
**Status:** Active
