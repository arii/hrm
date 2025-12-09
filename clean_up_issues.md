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

## Open Issues - Atomic & Actionable (29 total)

### Security & Production Readiness (High Priority)
- [ ] #719 - Add CSRF protection for state-changing API routes
- [ ] #720 - Gate or remove debug API endpoints in production
- [ ] #721 - Implement WebSocket reconnection with exponential backoff
- [ ] #722 - Add request validation middleware using Zod schemas
- [ ] #723 - Implement rate limiting for API endpoints

### Features
- [ ] #122 - Implement Workout History
- [ ] #605 - Settings Drawer & Theme Toggle
- [ ] #606 - Enhanced Data Visualization: Heart Rate Zones & Typography
- [ ] #709 - Refactor: Centralize Spotify API Client
- [ ] #710 - Add Start/Stop Workout Button and Timer Display
- [ ] #711 - Create Reusable Dashboard Widget Component Library
- [ ] #712 - Heart Rate Data Processing and Analytics Utility
- [ ] #724 - Add health check and readiness endpoints

### UI/UX Improvements
- [ ] #460 - Ensure consistent capitalization for all UI buttons and headings
- [ ] #573 - Prioritize Custom Font Loading for Stability
- [ ] #653 - Implement Modern Color System & Typography Hierarchy
- [ ] #656 - Enhance Spotify Controls Visual Design
- [ ] #657 - Optimize Touch Targets & Bottom Navigation for Mobile
- [ ] #673 - UI quick fixes

### Infrastructure & Code Quality
- [ ] #472 - Implement Release Automation & Safety Enforcement
- [ ] #562 - Establish API Contract Management and Validation Strategy
- [ ] #568 - Refactor: Decouple Server Logic and Standardize Service Interfaces
- [ ] #581 - Software Engineering Principle Quick Fixes
- [ ] #713 - Comprehensive Codebase & Configuration Cleanup
- [ ] #714 - Create Linting Script for JavaScript Files
- [ ] #718 - Replace console.log with structured logger in API routes
- [ ] #725 - Document API endpoints with OpenAPI/Swagger specification
- [ ] #726 - Consolidate volume state management into single hook
- [ ] #727 - Add TypeScript path aliases for cleaner imports

---

## Review Notes
(Add notes here as you review each issue)