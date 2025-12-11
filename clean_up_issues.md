# Issue Cleanup Progress Tracker

## Workflow
1. Use `gh issue view` to examine each issue
2. Determine if the issue is still relevant or can be closed
3. If no longer relevant: Add comment explaining closure reason → Close with `gh issue close <number>`
4. If still relevant: Create new issue with updated info → Link old to new → Close old issue
5. Check off completed items below

---

## Completed (Closed during cleanup)
- [x] #408 - Epic: Core Architecture - Closed (all sub-issues completed)
- [x] #410 - Epic: Spotify Integration - Closed (all sub-issues completed)
- [x] #411 - Epic: Frontend UI/UX - Closed (keeping atomic issues instead)
- [x] #592 - Production Readiness Epic - Closed (keeping atomic issues)
- [x] #593 - Critical Blockers Checklist - Closed (keeping atomic issues)
- [x] #595 - Medium Priority Checklist - Closed (keeping atomic issues)
- [x] #668 - Refine 'any' type in AuthContext - Closed (file no longer exists)
- [x] #670 - Remove reportWebVitals - Closed (already removed)
- [x] #672 - Remove serviceWorker - Closed (already removed)

## Closed During Batch Cleanup (29 total)
- [x] #719 - Add CSRF protection for state-changing API routes
- [x] #720 - Gate or remove debug API endpoints in production
- [x] #721 - Implement WebSocket reconnection with exponential backoff
- [x] #722 - Add request validation middleware using Zod schemas
- [x] #723 - Implement rate limiting for API endpoints
- [x] #122 - Implement Workout History
- [x] #605 - Settings Drawer & Theme Toggle
- [x] #606 - Enhanced Data Visualization: Heart Rate Zones & Typography
- [x] #709 - Refactor: Centralize Spotify API Client
- [x] #710 - Add Start/Stop Workout Button and Timer Display
- [x] #711 - Create Reusable Dashboard Widget Component Library
- [x] #712 - Heart Rate Data Processing and Analytics Utility
- [x] #724 - Add health check and readiness endpoints
- [x] #460 - Ensure consistent capitalization for all UI buttons and headings
- [x] #573 - Prioritize Custom Font Loading for Stability
- [x] #653 - Implement Modern Color System & Typography Hierarchy
- [x] #656 - Enhance Spotify Controls Visual Design
- [x] #673 - UI quick fixes
- [x] #472 - Implement Release Automation & Safety Enforcement
- [x] #562 - Establish API Contract Management and Validation Strategy
- [x] #568 - Refactor: Decouple Server Logic and Standardize Service Interfaces
- [x] #581 - Software Engineering Principle Quick Fixes
- [x] #713 - Comprehensive Codebase & Configuration Cleanup
- [x] #714 - Create Linting Script for JavaScript Files
- [x] #718 - Replace console.log with structured logger in API routes
- [x] #725 - Document API endpoints with OpenAPI/Swagger specification
- [x] #727 - Add TypeScript path aliases for cleaner imports

## Currently Active Issues (9 total) - Need Attention

### Blocking Issues (Release 0.2.1+)
- [ ] #985 - Epic: Core Architecture 2.0 (State Management SSOT & Hydration) - HIGH PRIORITY
  - Major architectural refactor for centralized state management
  - Blocks proper scaling and feature development
  - Status: Detailed specification in issue
  
- [ ] #1042 - Update Release Please - NEEDS CLARIFICATION
  - Title and description are vague
  - Requires breakdown into specific actionable items
  
- [ ] #1007 - Improve Timer State Handling
  - Timestamp-based resumable timer implementation
  - Needed for robust workout tracking
  - Status: Clear spec in issue

### Infrastructure & Testing (Medium Priority)
- [ ] #1008 - Docker Architecture
  - Complete Docker setup guide with PM2 integration
  - Status: Comprehensive spec with shell scripts
  
- [ ] #1023 - Photographer Script
  - Automation for Playwright/Storybook visual testing
  - Status: Setup guide provided, awaiting implementation
  
- [ ] #1017 - Storybook Foundational Tests
  - Component-driven development testing strategy
  - Status: Detailed approach documented

### Resilience Features (Medium Priority)
- [ ] #1041 - Implement Heartbeat Connection Watchdog & Server-Side Stale Data Eviction
  - WebSocket connection health monitoring
  - Automatic stale session cleanup
  - Status: Full technical spec provided
  
- [ ] #1011 - Network Connectivity Awareness
  - Resilient WebSocket reconnection with network event listeners
  - Status: Detailed implementation strategy available

---

## Next Steps for Active Issues

### For Each Open Issue:
1. **Review the current specification** - Most have detailed specs already in issue body
2. **Add Acceptance Criteria** - If missing, create clear definition of done
3. **Add Labels** - Priority, Effort Estimate (S/M/L), Feature/Bug/Chore
4. **Break Down Epics** - #985, #895 should have subtasks/checklist
5. **Timeline** - Add target milestone for 0.2.1 or 0.2.2

### Release Blockers
- **#985** - Core Architecture 2.0: Determine if this blocks 0.2.1 or is 0.3.0 scope
- **#1042** - Clarify what "update release please" means and split into actionable items
- **#1007** - Timer state handling: Verify if needed for 0.2.1 release

### High-Value Items
- **#1023** (Photographer Script) - Already has implementation guide, quick win
- **#1017** (Storybook Tests) - Setup is documented, ready to implement
- **#1008** (Docker) - Infrastructure, needed for deployment scaling

---

## Review Notes

### December 10, 2025 Updates
- Confirmed 29 issues from atomic & actionable section are now closed
- Updated document to reflect current 9 active issues
- Identified blocking issues for 0.2.1 release
- Marked high-priority items for immediate attention
- Issues now better aligned with current codebase state (Next.js 16, NextAuth v4, deployment automation)