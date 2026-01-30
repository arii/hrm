# PR #5128 Refactor Status

## Completed ✅

1. **Gender-aware calorie estimation** - Added `gender` parameter to `estimateCaloriesBurned()`
2. **Error handling in storage** - Added try-catch blocks and fallback logic to `WorkoutSessionStorage`
3. **JSDoc documentation** - Added comprehensive comments to storage class
4. **dtSeconds gap documentation** - Clarified 10-second threshold in `useCalorieTracker`
5. **Removed duplicate code** - Deleted PR #5128's localStorage-only implementation
6. **Updated UI components** - Fixed imports to use #5110's infrastructure
7. **Test updates** - Updated calorie estimation tests for gender parameter

## Remaining Issues ❌

### Critical Issues from Audit

1. **Broken interval in ExperimentalAnalyticsPage** - Not yet addressed, needs ref pattern
2. **Performance** - Partially addressed (IndexedDB vs localStorage), but still needs throttling

### Integration Issues

1. **Hook API mismatch**:
   - `useWorkoutSessionManager` returns `session` (not `currentSession`)
   - Missing `allSessions` - need to add `getAllSessions()` method
   - Missing method name mappings (startWorkout vs startSession, etc.)

2. **Missing features in useWorkoutSessionManager**:
   - No session list retrieval
   - No session deletion
   - May need wrapper hook to provide #5128's expected API

### Recommendation

Given the complexity, recommend one of:

1. **Quick Fix**: Create adapter hook `useWorkoutSessionStorage` that wraps `useWorkoutSessionManager` + `WorkoutSessionStorage` to match expected API
2. **Full Refactor**: Rewrite ExperimentalAnalyticsPage to directly use #5110's API (more changes, cleaner)
3. **Defer**: Mark PR as draft, complete integration separately

## Files Modified

- lib/calorie-estimation.ts ✅
- lib/workout-session-storage.ts ✅
- hooks/useCalorieTracker.ts ✅
- tests/unit/lib/calorie-estimation.test.ts ✅
- app/client/experimental/components/\*.tsx ⚠️ (partial)
