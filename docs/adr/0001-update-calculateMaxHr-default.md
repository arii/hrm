# ADR-0001: Update `calculateMaxHr` Default Behavior

## Status

Proposed

## Context

During a code cleanup and refactoring task, the `calculateMaxHr` function was identified as being duplicated in `utils/constants.ts` and `utils/hr-zones.ts`. The version in `utils/constants.ts` was deemed more robust as it handled `null`, `undefined`, and non-numeric inputs by returning a safe default (`MAX_HR_DEFAULT`, which is 185). The version in `utils/hr-zones.ts` had a different hardcoded default for `age <= 0`, returning 200.

The task was to consolidate to the more robust version of the function, which resulted in a change to the default behavior for invalid or edge-case age inputs.

## Decision

We will proceed with the behavior from `utils/constants.ts` as the single source of truth for the `calculateMaxHr` function. This means that for any invalid age input (e.g., `0`, `null`, `undefined`, non-numeric), the function will return `185`.

## Consequences

-   **Pros**:
    -   The `calculateMaxHr` function is now centralized and more robust, handling a wider range of inputs.
    -   The codebase is cleaner and more maintainable with the removal of the duplicate function.
-   **Cons**:
    -   The default maximum heart rate for users with an age of 0 or other invalid age data has changed from 200 to 185. This will affect HR zone calculations for these users. Given that a valid age is expected for accurate HR zone calculations, this change is deemed acceptable.
