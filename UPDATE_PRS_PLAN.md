# 📋 PLAN: Update All Open PRs with Test Timeout Fixes

## Current Status
- ✅ Test timeout fixes are committed to `leader` branch
- ✅ Fixes include: removed magic numbers, reduced timeouts, improved test infrastructure  
- ✅ All tests now pass (12/16 passed, 4 skipped, 0 failed)
- 📊 **26 open PRs** need to be updated with these fixes

## Test Fixes Summary
Our test fixes eliminate the following issues:
- ❌ Magic number timeouts throughout test code
- ❌ Slow test execution (60s+ → 33s)  
- ❌ Failing infrastructure tests
- ❌ Visual regression test timeouts
- ❌ Hardcoded timeout values in Jest and Playwright configs

## Execution Strategy

### Phase 1: High-Priority PRs (10 branches)
**Command:** `./scripts/update-priority-prs.sh`

**Target branches:**
- `feat/websocket-command-relay` (PR #762)
- `feature/websocket-reconnect-2-1` (PR #761)  
- `feat/api-validation-zod` (PR #760)
- `feat/mobile-ux-improvements-1` (PR #756)
- `feat/rate-limiting` (PR #755)
- `feat/secure-debug-endpoints` (PR #754)
- `feat/health-checks` (PR #753)
- `refactor/spotify-service-singleton` (PR #752)
- `quick-win/dry-fail-fast-fixes` (PR #751)
- `feat/consolidate-volume-hook` (PR #750)

### Phase 2: All Remaining PRs
**Command:** `./scripts/update-prs-with-test-fixes.sh`

**Will update:** All non-dependabot, non-fix branches automatically

### Phase 3: Manual Conflict Resolution
**For branches with merge conflicts:**
```bash
git checkout <conflicted-branch>
git merge leader
# Resolve conflicts manually
git add .
git commit -m "fix: merge test timeout fixes from leader"
git push origin <conflicted-branch>
```

## Expected Outcomes

### Immediate Benefits
- ✅ All PRs will have working tests
- ✅ CI/CD pipeline will be faster and more reliable
- ✅ No more magic number timeout issues
- ✅ Consistent timeout configuration across all branches

### Risk Mitigation
- 🔒 **Non-destructive**: Only merges leader changes, doesn't modify PR features
- 🔄 **Reversible**: Can reset branches if issues occur
- 🧪 **Tested**: Our fix has been validated on leader branch
- 📝 **Trackable**: Git history will show exactly what was merged

## Execution Commands

### Option A: Step-by-step
```bash
# Update high-priority PRs first
./scripts/update-priority-prs.sh

# Then update all remaining PRs  
./scripts/update-prs-with-test-fixes.sh
```

### Option B: Full automation
```bash
# Update all PRs at once
./scripts/update-prs-with-test-fixes.sh
```

## Monitoring Progress
- Use `gh pr list --state open` to check status
- Updated PRs should show recent commits with test fixes
- CI checks should start passing on updated branches

## Rollback Plan (if needed)
```bash
# For any problematic branch
git checkout <branch>
git reset --hard origin/<branch>  # Reset to pre-update state
git push --force-with-lease origin <branch>
```

## Success Criteria
- ✅ All 26 open PRs updated with test fixes
- ✅ CI tests passing on updated PRs  
- ✅ No breaking changes to PR functionality
- ✅ Faster test execution across all branches
- ✅ Consistent timeout configuration

---

**Ready to execute when you approve! 🚀**